package com.travelport.core.servlets;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.apache.sling.api.servlets.SlingSafeMethodsServlet;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;

import org.osgi.service.component.annotations.Component;

import javax.servlet.Servlet;
import java.io.IOException;
import java.sql.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component(
        service = Servlet.class,
        property = {
                "sling.servlet.paths=/bin/products",
                "sling.servlet.methods=GET"
        }
)
public class ProductServlet extends SlingSafeMethodsServlet {

    private static final Logger log = LoggerFactory.getLogger(ProductServlet.class);

    // 🔥 Update with your actual DB connection details
    private static final String JDBC_URL = "jdbc:mysql://localhost:3306/travelport";
    private static final String DB_USER = "root";
    private static final String DB_PASSWORD = "Travel@1234";

    // Load MySQL driver (optional for newer JDBC, safe for OSGi)
    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        }
    }

    private Connection getConnection() {
        try {
            return DriverManager.getConnection(JDBC_URL, DB_USER, DB_PASSWORD);
        } catch (SQLException e) {
            log.error("DB Connection Error: {}", e.getMessage());
            return null;
        }
    }

    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse response)
            throws IOException {

        response.setContentType("application/json");

        String location = request.getParameter("location");

        if (location != null && !location.isEmpty()) {
            response.getWriter().write(getProductsByLocation(location));
            return;
        }

        response.getWriter().write("{\"error\":\"Missing required parameter: location\"}");
    }

    private String getProductsByLocation(String location) {

        JsonArray productArray = new JsonArray();
        JsonObject finalJson = new JsonObject();

        String sql = "SELECT product_name, location_applicable, rack_rate, product_type " +
                "FROM product_master " +
                "WHERE location_applicable = ? OR location_applicable = 'BOTH'";

        try (Connection con = getConnection();
             PreparedStatement stmt = con.prepareStatement(sql)) {

            if (con == null) {
                return "{\"error\":\"DB Connection failed\"}";
            }

            stmt.setString(1, location.toUpperCase());
            ResultSet rs = stmt.executeQuery();

            while (rs.next()) {

                JsonObject product = new JsonObject();
                product.addProperty("product_name", rs.getString("product_name"));
                product.addProperty("location_applicable", rs.getString("location_applicable"));
                product.addProperty("rack_rate", rs.getDouble("rack_rate"));
                product.addProperty("product_type", rs.getString("product_type"));

                productArray.add(product);
            }

            finalJson.add("products", productArray);
            return finalJson.toString();

        } catch (SQLException e) {
            log.error("Error fetching products by location: {}", e.getMessage());
            return "{\"error\":\"Unable to fetch products\"}";
        }
    }
}
