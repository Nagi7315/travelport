package com.travelport.core.services.impl;

import com.travelport.core.services.EmailSenderService;
import org.apache.commons.mail.Email;
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.SimpleEmail;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import com.day.cq.mailer.MessageGateway;
import com.day.cq.mailer.MessageGatewayService;

@Component(service = EmailSenderService.class)
public class EmailSenderServiceImpl implements EmailSenderService {

    @Reference
    private MessageGatewayService messageGatewayService;

    @Override
    public void sendEmail(String recipient, String subject, String body) {

        MessageGateway<Email> messageGateway = messageGatewayService.getGateway(Email.class);

        if (messageGateway != null) {
            try {
                SimpleEmail email = new SimpleEmail();
                email.addTo(recipient);
                email.setSubject(subject);
                email.setMsg(body);   // Plain text body
                email.setCharset("UTF-8");

                messageGateway.send(email);

            } catch (EmailException e) {
                e.printStackTrace();
            }
        } else {
            System.out.println("No MessageGateway configured!");
        }
    }
}

