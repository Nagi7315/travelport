/* -------------------- UTILITIES -------------------- */

function formatCurrency(value) {
    return "£" + Number(value).toFixed(2);
}

function createTable(items) {
    let html = `
        <table class="w-full border border-gray-300 rounded-lg overflow-hidden">
            <thead class="bg-gray-100 text-left">
                <tr>
                    <th class="px-4 py-2">Product</th>
                    <th class="px-4 py-2 text-center">Qty</th>
                    <th class="px-4 py-2 text-right">Rack Rate</th>
                    <th class="px-4 py-2 text-center">Discount</th>
                    <th class="px-4 py-2 text-right">Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(item => {
        html += `
            <tr class="border-t">
                <td class="px-4 py-2">${item.product_name}</td>
                <td class="px-4 py-2 text-center">${item.quantity}</td>
                <td class="px-4 py-2 text-right">${formatCurrency(item.rack_rate)}</td>
                <td class="px-4 py-2 text-center">${item.discount_percent}%</td>
                <td class="px-4 py-2 text-right font-semibold">${formatCurrency(item.total_after_discount)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;
    return html;
}

/* -------------------- RENDER HOME TABLE -------------------- */

function renderHome(homeItems) {
    const container = document.getElementById("home-table-container");
    if (!container) return;

    if (!homeItems.length) {
        container.innerHTML = `<p class="text-gray-500">No home products submitted.</p>`;
        return;
    }

    const total = homeItems.reduce((sum, i) => sum + i.total_after_discount, 0);
    const avgDiscount = homeItems.reduce((sum, i) => sum + i.discount_percent, 0) / homeItems.length;
    const totalRackRate = homeItems.reduce((sum, i) => sum + i.rack_rate, 0);

    const blendedDiscount = totalRackRate > 0
        ? ((totalRackRate - total) / totalRackRate) * 100
        : 0;


    document.getElementById("home-summary").textContent =
        `Avg Discount: ${avgDiscount.toFixed(2)}% · Total: ${formatCurrency(total)} · Blended Discount: ${blendedDiscount.toFixed(2)}%`;

    container.innerHTML = createTable(homeItems);
}

/* -------------------- RENDER BRANCH LOCATIONS -------------------- */

function renderBranches(branchItems) {
    const container = document.getElementById("branch-locations-container");
    if (!container) return;

    if (!branchItems.length) {
        container.innerHTML = `<p class="text-gray-500">No branch locations submitted.</p>`;
        return;
    }

    document.getElementById("branch-count-chip").textContent =
        `${branchItems.length} Branches`;

    container.innerHTML = "";

    branchItems.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "border border-gray-300 rounded-xl bg-white shadow-sm p-4";

        card.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">Branch ${index + 1}</h3>
            ${createTable([item])}
        `;

        container.appendChild(card);
    });


   

        const total = branchItems.reduce((sum, i) => sum + i.total_after_discount, 0);
    const avgDiscount = branchItems.reduce((sum, i) => sum + i.discount_percent, 0) / branchItems.length;
    const totalRackRate = branchItems.reduce((sum, i) => sum + i.rack_rate, 0);

    const blendedDiscount = totalRackRate > 0
        ? ((totalRackRate - total) / totalRackRate) * 100
        : 0;


    document.getElementById("branch-summary").textContent =
        `Avg Discount: ${avgDiscount.toFixed(2)}% · Total: ${formatCurrency(total)} · Blended Discount: ${blendedDiscount.toFixed(2)}%`;

    // container.innerHTML = createTable(branchItems);


}

/* -------------------- DISCOUNT CALCULATIONS -------------------- */

function calculateMaxDiscount(allItems) {
    if (!allItems.length) return 0;
    return Math.max(...allItems.map(i => i.discount_percent));
}

function calculateBlendedDiscount(allItems) {
    if (!allItems.length) return 0;

    const totalRack = allItems.reduce((s, i) => s + i.rack_rate, 0);
    const totalAfter = allItems.reduce((s, i) => s + i.total_after_discount, 0);

    const blended = ((totalRack - totalAfter) / totalRack) * 100;
    return blended.toFixed(2);
}

/* -------------------- APPROVER ROUTING -------------------- */

function updateApproverRouting(maxDisc, blendedDisc) {
    const approver1 = document.getElementById("approver1-status");
    const approver2 = document.getElementById("approver2-status");

    const a1Trigger = document.getElementById("approver1-trigger");
    const a2Trigger = document.getElementById("approver2-trigger");

     const approver1Card = document.getElementById("approver1-card");
    const approver2Card = document.getElementById("approver2-card");

     const gridContainer = document.querySelector(".grid.grid-cols-1.lg\\:grid-cols-2");

    if (maxDisc > 80 || blendedDisc > 60) {
        approver1.textContent = "Required";
        approver1.className = "badge bg-indigo-100 text-indigo-800";
        a1Trigger.textContent = "Routing triggered based on discount thresholds.";
        enableApprover("approver1");
    } else {
        approver1.textContent = "Not Required";
        approver1.className = "badge bg-gray-200 text-gray-700";
        a1Trigger.textContent = "Threshold not met.";
        disableApprover("approver1");
    }

    if (blendedDisc > 60) {
        approver2.textContent = "Required";
        approver2.className = "badge bg-yellow-100 text-yellow-800";
        a2Trigger.textContent = "Triggered due to blended discount.";
        enableApprover("approver2");
    } else {
        approver2.textContent = "Not Required";
        approver2.className = "badge bg-gray-200 text-gray-700";
        a2Trigger.textContent = "Threshold not met.";
        disableApprover("approver2");
    }
        // ------------------- Conditional card visibility -------------------
    if (blendedDisc < 60) {
        // Show only Approver 1
        approver1Card.style.display = "block";
        approver2Card.style.display = "none";

        // Make it full width
        gridContainer.classList.remove("lg:grid-cols-2");
        gridContainer.classList.add("lg:grid-cols-1");
    } else {
        // Show both
        approver1Card.style.display = "block";
        approver2Card.style.display = "block";

        // Keep two-column layout
        gridContainer.classList.remove("lg:grid-cols-1");
        gridContainer.classList.add("lg:grid-cols-2");
    }


}

function enableApprover(id) {
    document.getElementById(`${id}-approve-btn`).disabled = false;
    document.getElementById(`${id}-reject-btn`).disabled = false;
    document.getElementById(`${id}-name`).disabled = false;
    document.getElementById(`${id}-date`).disabled = false;
}

function disableApprover(id) {
    document.getElementById(`${id}-approve-btn`).disabled = true;
    document.getElementById(`${id}-reject-btn`).disabled = true;
    document.getElementById(`${id}-name`).disabled = true;
    document.getElementById(`${id}-date`).disabled = true;
}

/* -------------------- LOAD SUBMISSION DATA -------------------- */
let currentBlendedDiscount = 0;
async function loadSubmittedData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get("formId");

        if (!id) {
            console.error("Missing formId in URL");
            return;
        }

        const api = `/bin/form/save?pagePath=/content/travelport/us/en/forms-info&id=${id}`;
        const response = await fetch(api);
        const data = await response.json();

        console.log("Loaded submission:", data);

        const home = data.data.home_products || [];
        const branch = data.data.branch_products || [];

        renderHome(home);
        renderBranches(branch);

        const allItems = [...home, ...branch];
        const maxDisc = calculateMaxDiscount(allItems);
        const blendedDisc = calculateBlendedDiscount(allItems);
        currentBlendedDiscount = blendedDisc
        document.getElementById("approver1-max").textContent = maxDisc + "%";
        document.getElementById("approver1-blended").textContent = blendedDisc + "%";

        document.getElementById("approver2-max").textContent = maxDisc + "%";
        document.getElementById("approver2-blended").textContent = blendedDisc + "%";

        updateApproverRouting(maxDisc, blendedDisc);

    } catch (err) {
        console.error("Failed to load:", err);
    }
}

/* -------------------- APPROVE / REJECT (REAL SERVLET CALL) -------------------- */
const getCsrfToken = async () => {
  const response = await fetch("/libs/granite/csrf/token.json", {
    credentials: "include",
  });
  const data = await response.json();
  return data.token;
};


async function handleApprovalAction(approver, action,name) {
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get("formId");

    const comments = document.getElementById(`${approver}-name`).value || "";
    const decisionDateInput = document.getElementById(`${approver}-date`);
    const decisionDate = decisionDateInput.value || new Date().toISOString().split('T')[0];

    const csrfToken = await getCsrfToken();

    // Determine if two approvals are required
    const blendedDisc = parseFloat(document.getElementById("approver1-blended").textContent);

    let payload = {
        pagePath: "/content/travelport/us/en/forms-info",
        id: formId,
        approver,
        action: action.toUpperCase(),
        comments,
        decisionDate,
        approverName:name
    };

    if (approver === "approver1") {
        // First approver
        if (blendedDisc < 60) {
            payload.approver2 = "NA";   // Only one approver
        } else {
            payload.approver2 = "Pending"; // Two approvers
        }
    }
    // Approver 2 payload does NOT include approver2 key

    try {
        const res = await fetch("/bin/form/approve", {
            method: "POST",
            headers: {
                "CSRF-Token": csrfToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const json = await res.json();
        console.log("Approval servlet response:", json);

        // Hide other approver card if finalStatus is REJECTED or APPROVED_FINAL
        const approver1Card = document.getElementById("approver1-card");
        const approver2Card = document.getElementById("approver2-card");
        const gridContainer = document.querySelector(".grid.grid-cols-1.lg\\:grid-cols-2");

        if (json.finalStatus === "REJECTED" || json.finalStatus === "APPROVED_FINAL") {
            if (approver === "approver1") {
                approver2Card.style.display = "none";
            } else {
                approver1Card.style.display = "none";
            }
            // Adjust grid layout to single column
            gridContainer.classList.remove("lg:grid-cols-2");
            gridContainer.classList.add("lg:grid-cols-1");
        } else if (json.finalStatus === "PENDING_APPROVER2") {
            // Show second approver card
            approver2Card.style.display = "block";
            gridContainer.classList.remove("lg:grid-cols-1");
            gridContainer.classList.add("lg:grid-cols-2");
        }

        updateApproverUI(approver, action);
    } catch (e) {
        console.error("Approval failed:", e);
    }
}



function updateApproverUI(approver, action) {

    const msg = document.getElementById(`${approver}-message`);
 
    msg.textContent = action === "approve"
        ? "Approved successfully."
        : "Rejected.";

    disableApprover(approver);
}

/* -------------------- INIT -------------------- */

document.addEventListener("DOMContentLoaded", loadSubmittedData);
