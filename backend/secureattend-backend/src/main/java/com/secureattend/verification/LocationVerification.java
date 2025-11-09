package com.secureattend.verification;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class LocationVerification implements VerificationStrategy {
    @Value("${secureattend.geo.center-lat}")
    private double centerLat;

    @Value("${secureattend.geo.center-lon}")
    private double centerLon;

    @Value("${secureattend.geo.radius-meters}")
    private double radiusMeters;

    @Value("${secureattend.geo.allowed-ssids:}")
    private String allowedSsidsCsv;

    @Override
    public String getName() {
        return "LOCATION";
    }

    @Override
    public boolean verify(VerificationInput input) {
        if (input == null || input.latitude == null || input.longitude == null) return false;

        boolean withinGeofence = isWithinRadius(input.latitude, input.longitude, centerLat, centerLon, radiusMeters);

        Set<String> allowedSsids = parseAllowedSsids();
        boolean ssidOk = allowedSsids.isEmpty() ||
                (input.wifiSsid != null && allowedSsids.contains(input.wifiSsid.trim()));

        return withinGeofence && ssidOk;
    }

    private Set<String> parseAllowedSsids() {
        if (allowedSsidsCsv == null || allowedSsidsCsv.isBlank()) return Set.of();
        Set<String> out = new HashSet<>();
        Arrays.stream(allowedSsidsCsv.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .forEach(out::add);
        return out;
    }

    private boolean isWithinRadius(double lat, double lon, double centerLat, double centerLon, double radiusMeters) {
        double R = 6371000.0; 
        double dLat = Math.toRadians(lat - centerLat);
        double dLon = Math.toRadians(lon - centerLon);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(centerLat)) * Math.cos(Math.toRadians(lat))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = R * c;
        return distance <= radiusMeters;
    }
}