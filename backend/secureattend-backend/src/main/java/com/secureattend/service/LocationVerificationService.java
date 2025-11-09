package com.secureattend.service;

import com.secureattend.domain.Session;
import com.secureattend.dto.VerificationResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class LocationVerificationService {
    
    @Value("${secureattend.geo.default-radius-meters:50}")
    private Double defaultRadiusMeters;

    public VerificationResult verifyLocation(Double studentLat, Double studentLon, 
                                            String studentWifi, Session session) {
        
        if (!session.isRequireLocation()) {
            return VerificationResult.success("Location verification not required")
                .addMetadata("skipped", true);
        }
        
        if (studentLat == null || studentLon == null) {
            return VerificationResult.failure("GPS coordinates not provided", 
                                            "MISSING_GPS_COORDINATES");
        }
        
        if (session.getLatitude() == null || session.getLongitude() == null) {
            return VerificationResult.failure("Session location not configured",
                                            "SESSION_LOCATION_NOT_SET");
        }
        
        double distance = calculateDistance(
            studentLat, studentLon,
            session.getLatitude(), session.getLongitude()
        );
        
        Double allowedRadius = session.getAllowedRadiusMeters() != null ? 
                              session.getAllowedRadiusMeters() : defaultRadiusMeters;
        
        if (distance > allowedRadius) {
            return VerificationResult.failure(
                String.format("Too far from classroom: %.1f meters (max: %.1f meters)", 
                            distance, allowedRadius),
                "LOCATION_TOO_FAR"
            ).addMetadata("distance", distance)
             .addMetadata("allowed", allowedRadius);
        }
        
        if (session.getWifiSSID() != null && !session.getWifiSSID().isEmpty()) {
            if (studentWifi == null || studentWifi.isEmpty()) {
                return VerificationResult.failure("WiFi SSID not provided", "MISSING_WIFI_SSID")
                    .addMetadata("distance", distance);
            }
            
            if (!studentWifi.equals(session.getWifiSSID())) {
                return VerificationResult.failure(
                    String.format("Wrong WiFi network: '%s' (expected: '%s')", 
                                studentWifi, session.getWifiSSID()),
                    "WRONG_WIFI_NETWORK"
                ).addMetadata("distance", distance)
                 .addMetadata("studentWifi", studentWifi)
                 .addMetadata("expectedWifi", session.getWifiSSID());
            }
        }
        
        return VerificationResult.success(
            String.format("Location verified: %.1f meters from classroom", distance)
        ).addMetadata("distance", distance)
         .addMetadata("wifiMatched", studentWifi != null && studentWifi.equals(session.getWifiSSID()));
    }


    private double calculateDistance(Double lat1, Double lon1, Double lat2, Double lon2) {
        final int R = 6371000;
        
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    }
}