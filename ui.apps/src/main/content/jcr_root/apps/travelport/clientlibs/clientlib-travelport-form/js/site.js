function formatCurrency(value) {
    return "£" + Number(value).toFixed(2);
}

function renderTable(tableId, items, discountId, totalId) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    tbody.innerHTML = "";
    let totalDiscount = 0, totalAmount = 0;

    items.forEach((item, index) => {
        totalDiscount += item.discount_percent;
        totalAmount += item.total_after_discount;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.product_name}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.rack_rate)}</td>
            <td class="text-center">${item.discount_percent}%</td>
            <td class="text-right font-bold" style="color:#005A9C;">
                ${formatCurrency(item.total_after_discount)}
            </td>
            <td class="text-center">
                <button class="btn btn-edit" onclick="editRow('${tableId}', ${index})">Edit</button>
                <button class="btn btn-view" onclick="viewDetails('${tableId}', ${index})">View</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    const avgDiscount = items.length ? (totalDiscount / items.length).toFixed(2) : 0;
    document.getElementById(discountId).textContent = avgDiscount + "%";
    document.getElementById(totalId).textContent = formatCurrency(totalAmount);
}

async function loadSubmittedData() {
    try {
        // Get params
        const urlParams = new URLSearchParams(window.location.search);
        const pagePath = urlParams.get("pagePath");
        const id = urlParams.get("id");

        if (!pagePath || !id) {
            console.error("Missing required parameters!");
            return;
        }

        // Build servlet URL
        const servletUrl = `/bin/form/save?pagePath=${pagePath}&id=${id}`;
        console.log("Fetching:", servletUrl);

        const response = await fetch(servletUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const submittedFormData = await response.json();
        console.log("Servlet Response:", submittedFormData);

        // Populate customer name or submittedBy if needed
        document.getElementById("customer-name").textContent = submittedFormData.submittedBy;

        // Extract home & branch data from JSON
        const homeProducts = submittedFormData.data.home_products || [];
        const branchProducts = submittedFormData.data.branch_products || [];

        // Render tables
        renderTable("submitted-home-table", homeProducts, 
                    "submitted-home-total-discount", "submitted-home-total-after");

        renderTable("submitted-branch-table", branchProducts, 
                    "submitted-branch-total-discount", "submitted-branch-total-after");

    } catch (error) {
        console.error("Failed to fetch submitted data:", error);
        alert("Failed to load submitted data. Please try again later.");
    }
}

function editRow()   {
    const urlParams = new URLSearchParams(window.location.search);
        const pagePath = urlParams.get("pagePath");
        const id = urlParams.get("id");
        window.location.href = `/content/travelport/us/en/forms-info.html?pagePath=${pagePath}&id=${id}`;

}
function viewDetails(){ alert("View Details coming soon"); }

document.addEventListener("DOMContentLoaded", loadSubmittedData);
