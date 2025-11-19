package com.travelport.core.servlets;

import com.google.gson.*;
import org.apache.commons.io.IOUtils;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.resource.*;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.osgi.service.component.annotations.Component;

import javax.servlet.Servlet;
import javax.servlet.ServletException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component(
        service = Servlet.class,
        property = {
                "sling.servlet.paths=/bin/form/save",
                "sling.servlet.methods=GET,POST"
        }
)
public class FormSubmitServlet extends SlingAllMethodsServlet {

    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        JsonObject out = new JsonObject();

        String id = request.getParameter("id");
        String pagePath = request.getParameter("pagePath");

        if (id == null || pagePath == null) {
            response.setStatus(400);
            out.addProperty("error", "Missing id or pagePath");
            response.getWriter().write(out.toString());
            return;
        }

        if (pagePath.endsWith(".html")) {
            pagePath = pagePath.substring(0, pagePath.length() - 5);
        }

        ResourceResolver rr = request.getResourceResolver();

        Resource formNode = rr.getResource(pagePath + "/jcr:content/" + id);
        if (formNode == null) {
            response.setStatus(404);
            out.addProperty("error", "Form not found");
            response.getWriter().write(out.toString());
            return;
        }

        ValueMap vm = formNode.getValueMap();

        out.addProperty("id", id);
        out.addProperty("status", vm.get("status", ""));
        out.addProperty("submittedBy", vm.get("submittedBy", ""));
        out.addProperty("submittedOn", vm.get("submittedOn", "").toString());
        out.add("data", JsonParser.parseString(vm.get("products", "{}")));

        JsonObject approversJson = new JsonObject();
        Resource approversNode = formNode.getChild("approvers");

        for (Resource child : approversNode.getChildren()) {
            ValueMap ap = child.getValueMap();
            JsonObject apJson = new JsonObject();
            apJson.addProperty("status", ap.get("status", ""));
            apJson.addProperty("comments", ap.get("comments", ""));
            approversJson.add(child.getName(), apJson);
        }

        out.add("approvers", approversJson);

        response.getWriter().write(out.toString());
    }

    @Override
    protected void doPost(SlingHttpServletRequest request, SlingHttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        JsonObject out = new JsonObject();

        // Read JSON Payload
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

        if (!jsonObject.has("page_path")) {
            response.setStatus(400);
            out.addProperty("error", "Missing page_path in request JSON");
            response.getWriter().write(out.toString());
            return;
        }

        String pagePath = jsonObject.get("page_path").getAsString();

        if (pagePath.endsWith(".html")) {
            pagePath = pagePath.substring(0, pagePath.length() - 5);
        }

        if (!jsonObject.has("products")) {
            response.setStatus(400);
            out.addProperty("error", "Missing products JSON");
            response.getWriter().write(out.toString());
            return;
        }

        JsonObject productsObj = jsonObject.getAsJsonObject("products");
        String productsJsonString = productsObj.toString();


        try (ResourceResolver rr = request.getResourceResolver()) {

            Resource pageContent = rr.getResource(pagePath + "/jcr:content");
            if (pageContent == null) {
                response.setStatus(404);
                out.addProperty("error", "Page not found: " + pagePath);
                response.getWriter().write(out.toString());
                return;
            }

            String randomId = UUID.randomUUID().toString();

            Map<String, Object> dataProps = new HashMap<>();
            dataProps.put("jcr:primaryType", "nt:unstructured");
            dataProps.put("products", productsJsonString);
            dataProps.put("status", "PENDING_APPROVER1");
            dataProps.put("submittedBy",
                    request.getRemoteUser() != null ? request.getRemoteUser() : "anonymous");
            dataProps.put("submittedOn", Calendar.getInstance());

            Resource dataNode = rr.create(pageContent, randomId, dataProps);

            Resource approvers = rr.create(dataNode, "approvers",
                    Collections.singletonMap("jcr:primaryType", "nt:unstructured"));

            // approver1 node
            rr.create(approvers, "approver1", new HashMap<String, Object>() {{
                put("jcr:primaryType", "nt:unstructured");
                put("status", "PENDING");
                put("comments", "");
                put("actor", "approver1");
            }});

            // approver2 node
            rr.create(approvers, "approver2", new HashMap<String, Object>() {{
                put("jcr:primaryType", "nt:unstructured");
                put("status", "WAITING");
                put("comments", "");
                put("actor", "approver2");
            }});

            rr.commit();

            out.addProperty("id", randomId);
            out.addProperty("path", dataNode.getPath());
            out.addProperty("message", "Form saved successfully");

            response.getWriter().write(out.toString());

        } catch (Exception e) {
            response.setStatus(500);
            out.addProperty("error", "JCR persist error: " + e.getMessage());
            response.getWriter().write(out.toString());
        }


    }

    @Override
    protected void doPut(SlingHttpServletRequest request, SlingHttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        JsonObject result = new JsonObject();

        // Read JSON body
        String jsonBody = IOUtils.toString(request.getInputStream(), StandardCharsets.UTF_8);

        JsonObject jsonObject;
        try {
            jsonObject = JsonParser.parseString(jsonBody).getAsJsonObject();
        } catch (Exception e) {
            response.setStatus(400);
            result.addProperty("error", "Invalid JSON format");
            response.getWriter().write(result.toString());
            return;
        }

        // Validate required fields
        if (!jsonObject.has("id") || !jsonObject.has("page_path")) {
            response.setStatus(400);
            result.addProperty("error", "Missing id or page_path in JSON");
            response.getWriter().write(result.toString());
            return;
        }

        String id = jsonObject.get("id").getAsString();
        String pagePath = jsonObject.get("page_path").getAsString();

        if (pagePath.endsWith(".html")) {
            pagePath = pagePath.substring(0, pagePath.length() - 5);
        }

        if (!jsonObject.has("products")) {
            response.setStatus(400);
            result.addProperty("error", "Missing products JSON");
            response.getWriter().write(result.toString());
            return;
        }

        JsonObject updatedProductsObj = jsonObject.getAsJsonObject("products");
        String updatedProductsString = updatedProductsObj.toString();

        ResourceResolver rr = request.getResourceResolver();

        try {

            // Locate existing form node
            String formNodePath = pagePath + "/jcr:content/" + id;
            Resource formNode = rr.getResource(formNodePath);

            if (formNode == null) {
                response.setStatus(404);
                result.addProperty("error", "Form not found: " + formNodePath);
                response.getWriter().write(result.toString());
                return;
            }

            ModifiableValueMap vm = formNode.adaptTo(ModifiableValueMap.class);

            // Update fields
            vm.put("products", updatedProductsString);
            vm.put("lastUpdatedOn", Calendar.getInstance());
            vm.put("lastUpdatedBy", request.getRemoteUser() != null ? request.getRemoteUser() : "anonymous");

            rr.commit();

            result.addProperty("id", id);
            result.addProperty("message", "Form updated successfully");
            result.addProperty("path", formNodePath);

            response.getWriter().write(result.toString());

        } catch (Exception e) {
            response.setStatus(500);
            result.addProperty("error", "Error updating form: " + e.getMessage());
            response.getWriter().write(result.toString());
        }
    }

}
