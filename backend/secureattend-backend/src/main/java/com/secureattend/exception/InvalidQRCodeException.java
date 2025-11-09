package com.secureattend.exception;

public class InvalidQRCodeException extends SecureAttendException {
    public InvalidQRCodeException(String qrCode) {
        super("Invalid QR code or codeword: " + qrCode, "INVALID_QR_CODE");
    }
}