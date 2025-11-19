package com.travelport.core.servlets;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.apache.commons.io.IOUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.ModifiableValueMap;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.osgi.service.component.annotations.Component;

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

            if ("APPROVE".equalsIgnoreCase(action)) {
                ap.put("status", "APPROVED");
                ap.put("comments", comments);
                ap.put("actionedOn", now);
                if (decisionDate != null) ap.put("decisionDate", decisionDate);

                if ("approver1".equalsIgnoreCase(approver)) {
                    subProps.put("status", "PENDING_APPROVER2");
                    Resource a2 = submission.getChild("approvers/approver2");
                    if (a2 != null) {
                        a2.adaptTo(ModifiableValueMap.class).put("status", "PENDING");
                    }
                } else {
                    subProps.put("status", "APPROVED_FINAL");
                }

            } else if ("REJECT".equalsIgnoreCase(action)) {
                ap.put("status", "REJECTED");
                ap.put("comments", comments);
                ap.put("actionedOn", now);
                if (decisionDate != null) ap.put("decisionDate", decisionDate);

                subProps.put("status", "REJECTED");
            } else {
                response.setStatus(400);
                out.addProperty("error", "Invalid action: " + action);
                response.getWriter().write(out.toString());
                return;
            }

            rr.commit();

            out.addProperty("message", "Approval updated successfully");
            out.addProperty("finalStatus", subProps.get("status", ""));

            response.getWriter().write(out.toString());

        } catch (Exception e) {
            response.setStatus(500);
            out.addProperty("error", "Error processing approval: " + e.getMessage());
            response.getWriter().write(out.toString());
        }
    }

}
