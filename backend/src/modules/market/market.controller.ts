import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { MarketService } from './market.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { BuyItemDto } from './dto/buy-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('listings')
  getListings(@CurrentUser() user: JwtPayload) {
    return this.marketService.getListings(user.sub as string);
  }

  @Get('my-listings')
  getMyListings(@CurrentUser() user: JwtPayload) {
    return this.marketService.getMyListings(user.sub as string);
  }

  @Post('listings')
  createListing(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateListingDto,
  ) {
    return this.marketService.createListing(user.sub as string, dto);
  }

  @Post('buy')
  buyFromListing(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BuyItemDto,
  ) {
    return this.marketService.buyFromListing(user.sub as string, dto);
  }

  @Delete('listings/:id')
  cancelListing(
    @CurrentUser() user: JwtPayload,
    @Param('id') listingId: string,
  ) {
    return this.marketService.cancelListing(user.sub as string, listingId);
  }

  @Get('history')
  getTransactionHistory(@CurrentUser() user: JwtPayload) {
    return this.marketService.getTransactionHistory(user.sub as string);
  }
}
