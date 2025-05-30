package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.CodeVerificationRequestDTO;
import com.example.orders_microservice.dto.PaymentRequestDTO;
import com.example.orders_microservice.dto.PaymentResponseDTO;
import com.example.orders_microservice.dto.PaymentValidationResponseDTO;

public interface PaymentService {
    PaymentResponseDTO initiatePayment(PaymentRequestDTO requestDTO);
    PaymentValidationResponseDTO verifyCode(CodeVerificationRequestDTO request);
    boolean resendVerificationCode(String transactionId);
}