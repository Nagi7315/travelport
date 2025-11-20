package com.travelport.core.servlets;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.travelport.core.services.EmailSenderService;
import org.apache.commons.io.IOUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.ModifiableValueMap;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

import javax.servlet.Servlet;
import javax.servlet.ServletException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Calendar;
import java.util.List;

@Component(
        service = Servlet.class,
        property = {
                "sling.servlet.paths=/bin/form/approve",
                "sling.servlet.methods=POST"
        }
)
public class FormApproveServlet extends SlingAllMethodsServlet {

    @Reference
    EmailSenderService emailSenderService;

    @Override
    protected void doPost(SlingHttpServletRequest request, SlingHttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        JsonObject out = new JsonObject();

        // Read JSON body
        String jsonBody = IOUtils.toString(request.getInputStream(), StandardCharsets.UTF_8);

        JsonObject jsonObject;
        try {
            jsonObject = JsonParser.parseString(jsonBody).getAsJsonObject();
        } catch (Exception e) {
            response.setStatus(400);
            out.addProperty("error", "Invalid JSON format");
            response.getWriter().write(out.toString());
            return;
        }

        // Validate required fields
        List<String> requiredFields = Arrays.asList("pagePath", "id", "approver", "action");
        for (String field : requiredFields) {
            if (!jsonObject.has(field)) {
                response.setStatus(400);
                out.addProperty("error", "Missing required field: " + field);
                response.getWriter().write(out.toString());
                return;
            }
        }

        String pagePath = jsonObject.get("pagePath").getAsString();
        if (pagePath.endsWith(".html")) {
            pagePath = pagePath.substring(0, pagePath.length() - 5);
        }

        String id = jsonObject.get("id").getAsString();
        String approver = jsonObject.get("approver").getAsString();
        String action = jsonObject.get("action").getAsString();
        String comments = jsonObject.has("comments") ? jsonObject.get("comments").getAsString() : "";
        String decisionDateStr = jsonObject.has("decisionDate") ? jsonObject.get("decisionDate").getAsString() : null;
        String approver2Field = jsonObject.has("approver2") ? jsonObject.get("approver2").getAsString() : null;

        try (ResourceResolver rr = request.getResourceResolver()) {

            Resource submission = rr.getResource(pagePath + "/jcr:content/" + id);
            if (submission == null) {
                response.setStatus(404);
                out.addProperty("error", "Submission not found: " + pagePath + "/jcr:content/" + id);
                response.getWriter().write(out.toString());
                return;
            }

            ModifiableValueMap subProps = submission.adaptTo(ModifiableValueMap.class);

            Resource approverNode = submission.getChild("approvers/" + approver);
            if (approverNode == null) {
                response.setStatus(404);
                out.addProperty("error", "Approver not found: " + approver);
                response.getWriter().write(out.toString());
                return;
            }

            ModifiableValueMap ap = approverNode.adaptTo(ModifiableValueMap.class);

            // Parse decisionDate if provided
            Calendar decisionDate = null;
            if (decisionDateStr != null && !decisionDateStr.isEmpty()) {
                try {
                    java.time.LocalDate localDate = java.time.LocalDate.parse(decisionDateStr);
                    decisionDate = Calendar.getInstance();
                    decisionDate.set(localDate.getYear(), localDate.getMonthValue() - 1, localDate.getDayOfMonth());
                } catch (Exception ignored) { }
            }

            Calendar now = Calendar.getInstance();
            String initiatorMail = "travelport16@gmail.com";

            // Handle APPROVE action
            if ("APPROVE".equalsIgnoreCase(action)) {
                ap.put("status", "APPROVED");
                ap.put("comments", comments);
                ap.put("actionedOn", now);
                if (decisionDate != null) ap.put("decisionDate", decisionDate);

                // Single vs two approver logic
                if ("approver1".equalsIgnoreCase(approver)) {
                    if ("NA".equalsIgnoreCase(approver2Field)) {
                        // Only one approver
                        subProps.put("status", "APPROVED_FINAL");
                    } else if ("Pending".equalsIgnoreCase(approver2Field)) {

                        // Two approvers
                        subProps.put("status", "PENDING_APPROVER2");
                        Resource a2 = submission.getChild("approvers/approver2");
                        if (a2 != null) {
                            a2.adaptTo(ModifiableValueMap.class).put("status", "PENDING");
                        }

                        String subjectInitiator = "Approval 1 Approved";
                        String bodyInitiator = "Hello,\n\n"
                                + "Your request has been approved by Approver 1.\n"
                                + "It is now moving to the next approval stage.\n\n"
                                + "Thank you.\nTravelport Team";
                        emailSenderService.sendEmail(initiatorMail,subjectInitiator,bodyInitiator);

                        String secondApproverMail = "kevensmith.travelport@gmail.com";
                        String subjectApprover2 = "Action Required: Approval 2 Needed";
                        String bodyApprover2 = "Hello,\n\n"
                                + "A request has been approved by Approver 1 and now needs your approval.\n"
                                + "Please review and take action.\n\n"
                                + "Thank you.\nTravelport Team";
                        emailSenderService.sendEmail(secondApproverMail,subjectApprover2,bodyApprover2);
                    } else {
                        // fallback
                        subProps.put("status", "APPROVED_FINAL");
                    }
                } else if ("approver2".equalsIgnoreCase(approver)) {
                    // Second approver approves → final
                    subProps.put("status", "APPROVED_FINAL");
                }

            } else if ("REJECT".equalsIgnoreCase(action)) {
                // Handle REJECT action
                ap.put("status", "REJECTED");
                ap.put("comments", comments);
                ap.put("actionedOn", now);
                if (decisionDate != null) ap.put("decisionDate", decisionDate);

                subProps.put("status", "REJECTED");

                String subjectInitiatorReject = "Request Rejected by Approver";

                String bodyInitiatorReject = "Hello,\n\n"
                        + "Your request has been rejected by Approver 1.\n"
                        + "Please review the comments and make any necessary changes.\n\n"
                        + "Thank you.\nTravelport Team";
                emailSenderService.sendEmail(initiatorMail,subjectInitiatorReject,bodyInitiatorReject);

            } else {
                response.setStatus(400);
                out.addProperty("error", "Invalid action: " + action);
                response.getWriter().write(out.toString());
                return;
            }

            rr.commit();

            out.addProperty("message", "Appr oval updated successfully");
            out.addProperty("finalStatus", subProps.get("status", ""));

            response.getWriter().write(out.toString());

        } catch (Exception e) {
            response.setStatus(500);
            out.addProperty("error", "Error processing approval: " + e.getMessage());
            response.getWriter().write(out.toString());
        }
    }
}
