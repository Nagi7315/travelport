package com.travelport.core.servlets;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.Servlet;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

@Component(
        service = Servlet.class,
        property = {
                "sling.servlet.methods={GET,POST}",
                "sling.servlet.paths=/bin/user-data",
                "sling.servlet.extensions=json"
        }
)
public class UserDataServlet extends SlingAllMethodsServlet {

    private static final long serialVersionUID = 1L;
    private static final Logger log = LoggerFactory.getLogger(UserDataServlet.class);

    private static final String FIREBASE_URL = "https://travelport-64da3-default-rtdb.firebaseio.com/user_data.json";

    @Override
    protected void doGet(final SlingHttpServletRequest req, final SlingHttpServletResponse resp) throws IOException {

        resp.setContentType("application/json;charset=UTF-8");

        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            HttpGet getRequest = new HttpGet(FIREBASE_URL);
            getRequest.addHeader("Accept", "application/json");

            try (CloseableHttpResponse firebaseResponse = httpClient.execute(getRequest)) {
                int statusCode = firebaseResponse.getStatusLine().getStatusCode();

                if (statusCode == 200) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(firebaseResponse.getEntity().getContent(), "UTF-8"));
                    StringBuilder responseBuilder = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        responseBuilder.append(line);
                    }
                    String jsonResponse = responseBuilder.toString();

                    log.info("Fetched data from Firebase: {}", jsonResponse);

                    resp.setStatus(200);
                    resp.getWriter().write(jsonResponse);

                } else {
                    log.error("Failed to fetch data from Firebase. Status code: {}", statusCode);
                    resp.sendError(500, "Failed to fetch data from Firebase");
                }
            }
        } catch (Exception e) {
            log.error("Exception while fetching data from Firebase", e);
            resp.sendError(500, "Error while fetching data from Firebase: " + e.getMessage());
        }
    }

    @Override
    protected void doPost(final SlingHttpServletRequest req, final SlingHttpServletResponse resp) throws IOException {
        StringBuilder jsonBuffer = new StringBuilder();
        try (BufferedReader reader = req.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) {
                jsonBuffer.append(line);
            }
        } catch (Exception e) {
            log.error("Error reading request body", e);
            resp.sendError(400, "Invalid JSON input");
            return;
        }

        String requestBody = jsonBuffer.toString();
        log.info("Received JSON body: {}", requestBody);

        JsonObject jsonObject;
        try {
            jsonObject = JsonParser.parseString(requestBody).getAsJsonObject();
        } catch (Exception e) {
            log.error("Failed to parse JSON", e);
            resp.sendError(400, "Malformed JSON");
            return;
        }


        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            HttpPost postRequest = new HttpPost(FIREBASE_URL);
            postRequest.addHeader("Content-Type", "application/json");
            postRequest.setEntity(new StringEntity(jsonObject.toString()));

            try (CloseableHttpResponse firebaseResponse = httpClient.execute(postRequest)) {
                int statusCode = firebaseResponse.getStatusLine().getStatusCode();

                if (statusCode == 200) {
                    log.info("Data successfully sent to Firebase");
                    resp.setStatus(200);
                    resp.getWriter().write("{\"status\":\"success\",\"message\":\"Data stored in Firebase\"}");
                } else {
                    log.error("Firebase submission failed. Status code: {}", statusCode);
                    resp.sendError(500, "Failed to submit data to Firebase");
                }
            }
        } catch (Exception e) {
            log.error("Exception while sending data to Firebase", e);
            resp.sendError(500, "Error sending data to Firebase: " + e.getMessage());
        }
    }
}
