import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'pet_clinic_page.dart';

class PetClinicModule implements CapabilityModule {
  const PetClinicModule();
  @override
  String get capabilityKey => 'pet_clinic';
  @override
  Widget buildPage(AppBranding branding) => PetClinicPage(branding: branding);
}
