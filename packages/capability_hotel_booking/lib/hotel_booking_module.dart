import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'hotel_booking_page.dart';

class HotelBookingModule implements CapabilityModule {
  const HotelBookingModule();
  @override
  String get capabilityKey => 'hotel_booking';
  @override
  Widget buildPage(AppBranding branding) => HotelBookingPage(branding: branding);
}
