package com.secureattend.verification;

public interface VerificationStrategy {
    String getName();

    boolean verify(VerificationInput input);
}
