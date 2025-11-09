package com.secureattend.verification;

import java.util.Objects;

import org.springframework.stereotype.Component;

import com.secureattend.domain.Session;
import com.secureattend.repository.SessionRepository;

@Component
public class CodewordVerification implements VerificationStrategy {
    private final SessionRepository sessionRepository;

    public CodewordVerification(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Override
    public String getName() {
        return "CODEWORD";
    }

    @Override
    public boolean verify(VerificationInput input) {
        if (input == null || input.sessionId == null || input.qrOrCodeword == null) return false;
        return sessionRepository.findById(input.sessionId)
                .map(Session::getCodeword)
                .filter(token -> Objects.equals(token, input.qrOrCodeword))
                .isPresent();
    }
}


