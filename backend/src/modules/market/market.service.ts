import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { BuyItemDto } from './dto/buy-item.dto';

const MARKET_FEE_PERCENT = 5;
const LISTING_EXPIRY_DAYS = 7;

@Injectable()
export class MarketService {
  constructor(private prisma: PrismaService) {}

  async getListings(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const listings = await this.prisma.marketListing.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
        quantity: { gt: 0 },
      },
      include: {
        item: true,
        seller: {
          include: {
            user: { select: { username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return listings.map(listing => ({
      id: listing.id,
      item: {
        id: listing.item.id,
        name: listing.item.name,
        description: listing.item.description,
        slot: listing.item.slot,
        rarity: listing.item.rarity,
        stats: listing.item.stats,
      },
      quantity: listing.quantity,
      pricePerUnit: listing.pricePerUnit,
      totalPrice: listing.quantity * listing.pricePerUnit,
      sellerUsername: listing.seller.user.username,
      sellerId: listing.sellerId,
      isOwnListing: listing.sellerId === character.id,
      expiresAt: listing.expiresAt,
      createdAt: listing.createdAt,
    }));
  }

  async getMyListings(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const listings = await this.prisma.marketListing.findMany({
      where: {
        sellerId: character.id,
        isActive: true,
      },
      include: {
        item: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return listings.map(listing => ({
      id: listing.id,
      item: {
        id: listing.item.id,
        name: listing.item.name,
        rarity: listing.item.rarity,
        slot: listing.item.slot,
      },
      quantity: listing.quantity,
      pricePerUnit: listing.pricePerUnit,
      totalPrice: listing.quantity * listing.pricePerUnit,
      expiresAt: listing.expiresAt,
      isExpired: listing.expiresAt < new Date(),
      createdAt: listing.createdAt,
    }));
  }

  async createListing(userId: string, dto: CreateListingDto) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Find the inventory item
    const inventoryItem = await this.prisma.characterInventory.findUnique({
      where: { id: dto.inventoryItemId },
      include: { item: true },
    });

    if (!inventoryItem || inventoryItem.characterId !== character.id) {
      throw new NotFoundException('Item not found in your inventory');
    }

    if (inventoryItem.quantity < dto.quantity) {
      throw new BadRequestException('Not enough items in inventory');
    }

    if (!inventoryItem.item.isTradeable) {
      throw new BadRequestException('This item cannot be traded');
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + LISTING_EXPIRY_DAYS);

    // Create listing and deduct from inventory in a transaction
    const [listing] = await this.prisma.$transaction([
      this.prisma.marketListing.create({
        data: {
          sellerId: character.id,
          itemId: inventoryItem.itemId,
          quantity: dto.quantity,
          pricePerUnit: dto.pricePerUnit,
          expiresAt,
        },
        include: { item: true },
      }),
      this.prisma.characterInventory.update({
        where: { id: dto.inventoryItemId },
        data: { quantity: { decrement: dto.quantity } },
      }),
    ]);

    // Clean up empty inventory slots
    await this.prisma.characterInventory.deleteMany({
      where: { characterId: character.id, quantity: { lte: 0 } },
    });

    return {
      id: listing.id,
      item: {
        id: listing.item.id,
        name: listing.item.name,
        rarity: listing.item.rarity,
      },
      quantity: listing.quantity,
      pricePerUnit: listing.pricePerUnit,
      totalPrice: listing.quantity * listing.pricePerUnit,
      expiresAt: listing.expiresAt,
    };
  }

  async buyFromListing(userId: string, dto: BuyItemDto) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const listing = await this.prisma.marketListing.findUnique({
      where: { id: dto.listingId },
      include: {
        item: true,
        seller: { include: { user: { select: { username: true } } } },
      },
    });

    if (!listing || !listing.isActive) {
      throw new NotFoundException('Listing not found or no longer active');
    }

    if (listing.expiresAt < new Date()) {
      throw new BadRequestException('This listing has expired');
    }

    if (listing.sellerId === character.id) {
      throw new BadRequestException('You cannot buy your own listing');
    }

    const quantity = dto.quantity ?? listing.quantity;

    if (quantity > listing.quantity) {
      throw new BadRequestException('Not enough items available');
    }

    const totalPrice = quantity * listing.pricePerUnit;
    const fee = Math.ceil(totalPrice * MARKET_FEE_PERCENT / 100);
    const sellerReceives = totalPrice - fee;

    if (Number(character.cash) < totalPrice) {
      throw new BadRequestException('Not enough cash');
    }

    // Execute transaction
    await this.prisma.$transaction([
      // Deduct cash from buyer
      this.prisma.character.update({
        where: { id: character.id },
        data: { cash: { decrement: totalPrice } },
      }),
      // Add cash to seller (minus fee)
      this.prisma.character.update({
        where: { id: listing.sellerId },
        data: { cash: { increment: sellerReceives } },
      }),
      // Add item to buyer inventory
      this.prisma.characterInventory.upsert({
        where: {
          characterId_itemId: {
            characterId: character.id,
            itemId: listing.itemId,
          },
        },
        create: {
          characterId: character.id,
          itemId: listing.itemId,
          quantity: quantity,
        },
        update: {
          quantity: { increment: quantity },
        },
      }),
      // Update or deactivate listing
      quantity === listing.quantity
        ? this.prisma.marketListing.update({
            where: { id: listing.id },
            data: { quantity: 0, isActive: false },
          })
        : this.prisma.marketListing.update({
            where: { id: listing.id },
            data: { quantity: { decrement: quantity } },
          }),
      // Create transaction record
      this.prisma.marketTransaction.create({
        data: {
          listingId: listing.id,
          buyerId: character.id,
          quantity,
          totalPrice,
          fee,
        },
      }),
    ]);

    return {
      success: true,
      item: {
        id: listing.item.id,
        name: listing.item.name,
        rarity: listing.item.rarity,
      },
      quantity,
      totalPrice,
      fee,
      sellerUsername: listing.seller.user.username,
    };
  }

  async cancelListing(userId: string, listingId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const listing = await this.prisma.marketListing.findUnique({
      where: { id: listingId },
      include: { item: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== character.id) {
      throw new ForbiddenException('This is not your listing');
    }

    if (!listing.isActive) {
      throw new BadRequestException('Listing is already inactive');
    }

    // Return items to inventory and deactivate listing
    await this.prisma.$transaction([
      this.prisma.marketListing.update({
        where: { id: listingId },
        data: { isActive: false },
      }),
      this.prisma.characterInventory.upsert({
        where: {
          characterId_itemId: {
            characterId: character.id,
            itemId: listing.itemId,
          },
        },
        create: {
          characterId: character.id,
          itemId: listing.itemId,
          quantity: listing.quantity,
        },
        update: {
          quantity: { increment: listing.quantity },
        },
      }),
    ]);

    return {
      success: true,
      returnedItem: {
        id: listing.item.id,
        name: listing.item.name,
        quantity: listing.quantity,
      },
    };
  }

  async getTransactionHistory(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Get transactions where user was buyer or seller
    const transactions = await this.prisma.marketTransaction.findMany({
      where: {
        OR: [
          { buyerId: character.id },
          { listing: { sellerId: character.id } },
        ],
      },
      include: {
        listing: {
          include: {
            item: true,
            seller: { include: { user: { select: { username: true } } } },
          },
        },
        buyer: { include: { user: { select: { username: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return transactions.map(tx => ({
      id: tx.id,
      type: tx.buyerId === character.id ? 'purchase' : 'sale',
      item: {
        id: tx.listing.item.id,
        name: tx.listing.item.name,
        rarity: tx.listing.item.rarity,
      },
      quantity: tx.quantity,
      totalPrice: tx.totalPrice,
      fee: tx.fee,
      netAmount: tx.buyerId === character.id
        ? -tx.totalPrice
        : tx.totalPrice - tx.fee,
      otherParty: tx.buyerId === character.id
        ? tx.listing.seller.user.username
        : tx.buyer.user.username,
      createdAt: tx.createdAt,
    }));
  }
}
