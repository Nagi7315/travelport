package com.travelport.core.servlets;

import com.google.gson.JsonObject;
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
import java.util.Calendar;

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

        JsonObject out = new JsonObject();
        response.setContentType("application/json");

        String pagePath = request.getParameter("pagePath");
        String id = request.getParameter("id");
        String approver = request.getParameter("approver");  // approver1 / approver2
        String action = request.getParameter("action");      // APPROVE / REJECT
        String comments = request.getParameter("comments");

        ResourceResolver rr = request.getResourceResolver();

        Resource submission = rr.getResource(pagePath + "/jcr:content/" + id);
        if (submission == null) {
            out.addProperty("error", "Submission not found");
            response.getWriter().write(out.toString());
            return;
        }

        ModifiableValueMap subProps = submission.adaptTo(ModifiableValueMap.class);

        Resource approverNode = submission.getChild("approvers/" + approver);
        ModifiableValueMap ap = approverNode.adaptTo(ModifiableValueMap.class);

        if ("APPROVE".equalsIgnoreCase(action)) {

            ap.put("status", "APPROVED");
            ap.put("comments", comments);
            ap.put("actionedOn", Calendar.getInstance());

            if (approver.equals("approver1")) {
                subProps.put("status", "PENDING_APPROVER2");

                Resource a2 = submission.getChild("approvers/approver2");
                a2.adaptTo(ModifiableValueMap.class).put("status", "PENDING");
            } else {
                subProps.put("status", "APPROVED_FINAL");
            }

        } else { // REJECT
            ap.put("status", "REJECTED");
            ap.put("comments", comments);
            ap.put("actionedOn", Calendar.getInstance());

            subProps.put("status", "REJECTED");
        }

        rr.commit();

        out.addProperty("message", "Updated successfully");
        out.addProperty("finalStatus", subProps.get("status", ""));

        response.getWriter().write(out.toString());
    }
}
