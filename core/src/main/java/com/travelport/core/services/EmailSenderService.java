package com.travelport.core.services;

public interface EmailSenderService {

    public void sendEmail(String recipient, String subject, String body);
}
