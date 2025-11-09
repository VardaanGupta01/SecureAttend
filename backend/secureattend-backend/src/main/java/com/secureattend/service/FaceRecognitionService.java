package com.secureattend.service;

import com.secureattend.domain.Student;
import com.secureattend.dto.VerificationResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.Random;

@Service
public class FaceRecognitionService {
    
    @Value("${secureattend.face.min-confidence:85.0}")
    private Double minConfidence;
    
    @Value("${secureattend.face.liveness-required:true}")
    private Boolean livenessRequired;
    
    @Value("${secureattend.face.api-enabled:false}")
    private Boolean apiEnabled;
    
    private final Random random = new Random();

    public VerificationResult verifyFace(Student student, String faceImageBase64, 
                                        Boolean livenessDetected) {
        
        if (faceImageBase64 == null || faceImageBase64.isEmpty()) {
            return VerificationResult.failure("Face image not provided", "MISSING_FACE_IMAGE");
        }
        
        if (student.getFaceImageBase64() == null || student.getFaceImageBase64().isEmpty()) {
            return VerificationResult.failure(
                "No reference photo found for student. Please upload your photo first.",
                "NO_REFERENCE_PHOTO"
            );
        }
        
        if (livenessRequired && (livenessDetected == null || !livenessDetected)) {
            return VerificationResult.failure(
                "Liveness detection failed. Please ensure you're using a live camera.",
                "LIVENESS_CHECK_FAILED"
            );
        }
        
        double confidence;
        
        if (apiEnabled) {
            confidence = performActualFaceRecognition(student.getFaceImageBase64(), faceImageBase64);
        } 
        else {
            confidence = mockFaceRecognition();
        }
        
        if (confidence >= minConfidence) {
            return VerificationResult.success(
                String.format("Face verified with %.1f%% confidence", confidence)
            ).addMetadata("confidence", confidence)
             .addMetadata("livenessDetected", livenessDetected)
             .addMetadata("threshold", minConfidence);
        } 
        else {
            return VerificationResult.failure(
                String.format("Face match confidence too low: %.1f%% (minimum: %.1f%%)", 
                            confidence, minConfidence),
                "LOW_FACE_CONFIDENCE"
            ).addMetadata("confidence", confidence)
             .addMetadata("threshold", minConfidence)
             .addMetadata("livenessDetected", livenessDetected);
        }
    }

    private double mockFaceRecognition() {
        
        if (random.nextDouble() < 0.8) {
            return 85.0 + (random.nextDouble() * 13.0); 
        } else {
            return 70.0 + (random.nextDouble() * 15.0); 
        }
    }


    private double performActualFaceRecognition(String referenceImage, String testImage) {
        /*
        try {
            CompareFacesRequest request = new CompareFacesRequest()
                .withSourceImage(new Image().withBytes(ByteBuffer.wrap(
                    Base64.getDecoder().decode(referenceImage))))
                .withTargetImage(new Image().withBytes(ByteBuffer.wrap(
                    Base64.getDecoder().decode(testImage))))
                .withSimilarityThreshold(minConfidence.floatValue());
            
            CompareFacesResult result = rekognitionClient.compareFaces(request);
            
            if (!result.getFaceMatches().isEmpty()) {
                return result.getFaceMatches().get(0).getSimilarity();
            }
            
            return 0.0;
        } catch (Exception e) {
            throw new RuntimeException("Face recognition API error: " + e.getMessage());
        }
        */
        
        return mockFaceRecognition();
    }
}