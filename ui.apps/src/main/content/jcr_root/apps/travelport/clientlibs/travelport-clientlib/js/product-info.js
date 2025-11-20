const fetchProducts = async (locationType) => {
  try {
    const response = await fetch(`/bin/products?location=${locationType}`);
    const data = await response.json();
    if (data.products) {
      return data.products.map((p) => ({
        name: p.product_name,
        rate: p.rack_rate,
        type: p.product_type,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

const getProductOptions = async (locationType, selectedProducts = []) => {
  const products = await fetchProducts(locationType);
  const filtered = products.filter((p) => !selectedProducts.includes(p.name));
  return filtered
    .map(
      (p) =>
        `<option value="${p.name}|${p.rate}|${p.type}">${p.name} (${p.type})</option>`
    )
    .join("");
};

const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return "0.00";
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const showError = (msg) => {
  const err = document.getElementById("form-error-msg");
  err.textContent = msg;
  err.classList.remove("hidden");
};

const hideError = () => {
  const err = document.getElementById("form-error-msg");
  err.textContent = "";
  err.classList.add("hidden");
};

const calculateRow = (row) => {
  const quantityInput = row.querySelector(".input-quantity");
  const discountInput = row.querySelector(".input-discount");
  const rackRateElement = row.querySelector(".input-rack-rate");
  const totalAfterDiscountElement = row.querySelector(".total-after-discount");

  const quantity = parseFloat(quantityInput.value || 0);
  let discountPercent = parseFloat(discountInput.value || 0);
  const rackRate = parseFloat(quantityInput.dataset.rackRate || 0);

  if (discountPercent > 100) {
    discountPercent = 100;
    discountInput.value = 100;
  }

  const discountMultiplier = 1 - discountPercent / 100;
  const totalAfterDiscount = rackRate * quantity * discountMultiplier;

  totalAfterDiscountElement.textContent = formatCurrency(totalAfterDiscount);

  return {
    rackTotal: rackRate * quantity,
    discountedTotal: totalAfterDiscount,
  };
};

const calculateLocationTotals = (
  tableId,
  totalDiscountPercentId,
  totalAfterDiscountId
) => {
  const table = document.getElementById(tableId);
  const rows = table.querySelectorAll(".table-row");

  let totalRackValue = 0;
  let totalDiscountedValue = 0;
  let maxDiscount = 0;

  rows.forEach((row) => {
    const results = calculateRow(row);
    totalRackValue += results.rackTotal;
    totalDiscountedValue += results.discountedTotal;

    const discountPercent = parseFloat(
      row.querySelector(".input-discount").value || 0
    );
    if (discountPercent > maxDiscount) maxDiscount = discountPercent;
  });

  const totalDiscount =
    totalRackValue > 0
      ? ((totalRackValue - totalDiscountedValue) / totalRackValue) * 100
      : 0;

  document.getElementById(totalDiscountPercentId).textContent =
    formatCurrency(totalDiscount) + "%";
  document.getElementById(totalAfterDiscountId).textContent =
    "£" + formatCurrency(totalDiscountedValue);

  return { totalRackValue, totalDiscountedValue, maxDiscount };
};

const calculateTotals = () => {
  const homeTotals = calculateLocationTotals(
    "home-product-table",
    "home-total-discount-percent",
    "home-total-after-discount"
  );
  const branchTotals = calculateLocationTotals(
    "branch-product-table",
    "branch-total-discount-percent",
    "branch-total-after-discount"
  );

  const totalRackValue =
    homeTotals.totalRackValue + branchTotals.totalRackValue;
  const totalDiscountedValue =
    homeTotals.totalDiscountedValue + branchTotals.totalDiscountedValue;

  const blendedDiscount =
    totalRackValue > 0
      ? ((totalRackValue - totalDiscountedValue) / totalRackValue) * 100
      : 0;

  document.getElementById("blended-discount").textContent =
    formatCurrency(blendedDiscount) + "%";

  // Workflow alert
  const alertBox = document.getElementById("workflow-alert");
  if (
    homeTotals.maxDiscount > 80 ||
    branchTotals.maxDiscount > 80 ||
    blendedDiscount > 60
  ) {
    alertBox.classList.remove("hidden");

    let message = "⚠️ <strong>Workflow Alert:</strong> ";
    if (homeTotals.maxDiscount > 80 || branchTotals.maxDiscount > 80) {
      message += `Individual Product Discount exceeds 80%. `;
    }
    if (blendedDiscount > 60) {
      message += `Blended Discount exceeds 60%.`;
    }

    alertBox.querySelector("p").innerHTML = message;
  } else {
    alertBox.classList.add("hidden");
  }
};

const addRowWithProduct = (tableId, product) => {
  const tableBody = document.getElementById(tableId);

  const newRow = document.createElement("tr");
  newRow.classList.add("table-row");

  const isFixed = product.type === "FIXED";

  newRow.innerHTML = `
        <td>
            <select class="input-product-name" onchange="updateRow(this)">
                <option selected value="${product.name}|${product.rate}|${product.type}">
                    ${product.name} (${product.type})
                </option>
            </select>
        </td>
        <td>
            <input type="number" value="${isFixed ? 1 : 1}" min="1"
            class="input-quantity text-center"
            data-rack-rate="${product.rate}"
            data-fixed="${isFixed}"
            ${isFixed ? "readonly" : ""} 
            oninput="calculateTotals()">
        </td>

        <td class="input-rack-rate text-right">${formatCurrency(product.rate)}</td>

        <td>
            <input type="number" min="0" max="100" value="0"
            class="input-discount text-center" oninput="calculateTotals()">
        </td>

        <td class="total-after-discount text-right">0.00</td>

        <td>
            <button onclick="removeRow(this)" class="text-red-600 hover:text-red-800 font-medium">Remove</button>
        </td>
    `;

  tableBody.appendChild(newRow);
  calculateTotals();
};


const addRow = async (tableId, locationType) => {
  const tableBody = document.getElementById(tableId);

  // Collect existing selections (to prevent duplicate options)
  const currentSelections = [
    ...tableBody.querySelectorAll(".input-product-name"),
  ].map((sel) => sel.value.split("|")[0]);

  const optionsHtml = await getProductOptions(locationType, currentSelections);

  const newRow = document.createElement("tr");
  newRow.classList.add("table-row");

  newRow.innerHTML = `
        <td>
            <select class="input-product-name" onchange="updateRow(this)">
                <option value="">Select Product...</option>
                ${optionsHtml}
            </select>
        </td>
        <td><input type="number" value="1" min="1" class="input-quantity text-center"
            data-rack-rate="0" data-fixed="false" oninput="calculateTotals()"></td>

        <td class="input-rack-rate text-right">0.00</td>

        <td><input type="number" min="0" max="100" value="0"
            class="input-discount text-center" oninput="calculateTotals()"></td>

        <td class="total-after-discount text-right">0.00</td>

        <td><button onclick="removeRow(this)" class="text-red-600 hover:text-red-800 font-medium">Remove</button></td>
    `;

  tableBody.appendChild(newRow);
};

const removeRow = (button) => {
  button.closest("tr").remove();
  calculateTotals();
};

const updateRow = async (selectElement) => {
  const row = selectElement.closest("tr");
  const parts = selectElement.value.split("|");
  if (parts.length !== 3) return;

  const [name, rateStr, type] = parts;
  const rate = parseFloat(rateStr);
  const isFixed = type === "FIXED";

  const quantityInput = row.querySelector(".input-quantity");
  const rackRateElement = row.querySelector(".input-rack-rate");

  quantityInput.dataset.rackRate = rate;
  quantityInput.dataset.fixed = isFixed;
  rackRateElement.textContent = formatCurrency(rate);

  if (isFixed) {
    quantityInput.value = 1; // fixed quantity
    quantityInput.setAttribute("readonly", true);
  } else {
    quantityInput.removeAttribute("readonly");
  }

  calculateTotals();
};

function formatSubmittedDate(rawDate) {
    const date = new Date(rawDate);

    if (isNaN(date.getTime())) {
        console.warn("Invalid date:", rawDate);
        return rawDate; // return original if parsing fails
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${day} ${month} ${year} ${hours}:${minutes}`;
}


// ===============================
// FORM OPERATIONS
// ===============================
const collectTableData = (tableId) => {
  const table = document.getElementById(tableId);
  const rows = table.querySelectorAll(".table-row");

  let invalidProduct = false;

  const products = [...rows].map((row) => {
    const selectValue = row.querySelector(".input-product-name").value;


    if (!selectValue) {
      invalidProduct = true;
      return null;
    }

    const parts = selectValue.split("|");

    return {
      product_name: parts[0],
      product_type: parts[2],
      quantity: parseFloat(row.querySelector(".input-quantity").value || 0),
      rack_rate: parseFloat(parts[1] || 0),
      discount_percent: parseFloat(
        row.querySelector(".input-discount").value || 0
      ),
      total_after_discount:
        parseFloat(
          row
            .querySelector(".total-after-discount")
            .textContent.replace(/,/g, "")
        ) || 0,
    };
  });

  if (invalidProduct) {
    throw new Error("Please select a product for every row before submitting.");
  }

  return products;
};

const getCsrfToken = async () => {
  const response = await fetch("/libs/granite/csrf/token.json", {
    credentials: "include",
  });
  const data = await response.json();
  return data.token;
};

// ---------------------------
// SUBMIT FORM
// ---------------------------
const submitForm = async () => {
  hideError();

  const customerName = document.getElementById("customerName").value.trim();
  if (!customerName) {
    showError("Customer name is required.");
    return;
  }

 let homeData, branchData;
    try {
    homeData = collectTableData("home-product-table");
    branchData = collectTableData("branch-product-table");
  } catch (validationError) {
    showError(validationError.message);
    return;
  }
  if (homeData.length === 0 && branchData.length === 0) {
    showError(
      "Please add at least one Home or Branch product before submitting."
    );
    return;
  }

  const csrfToken = await getCsrfToken();


    const homeTotals = calculateLocationTotals(
    "home-product-table",
    "home-total-discount-percent",
    "home-total-after-discount"
  );
  const branchTotals = calculateLocationTotals(
    "branch-product-table",
    "branch-total-discount-percent",
    "branch-total-after-discount"
  );


  const totalRackValue = homeTotals.totalRackValue + branchTotals.totalRackValue;
  const totalDiscountedValue = homeTotals.totalDiscountedValue + branchTotals.totalDiscountedValue;
  const blendedDiscount = totalRackValue > 0
    ? ((totalRackValue - totalDiscountedValue) / totalRackValue) * 100
    : 0;

  const payload = {
    page_path: window.location.pathname,
    customerName: customerName,
    products: {
      home_products: homeData,
      branch_products: branchData,
    },
    blended_discount: blendedDiscount.toFixed(2)
  };

  try {
    const response = await fetch("/bin/form/save", {
      method: "POST",
      headers: {
        "CSRF-Token": csrfToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
       const data = await response.json();
       console.log("Servlet Response:", data);
      const redirectUrl = `/content/travelport/us/en/submissions.html`;
      window.location.href = `/content/travelport/us/en/submissions.html`;
      console.log("redirected")
    }
  } catch (error) {
    console.error("Submit Error:", error);
  }
};

// ---------------------------
// SAVE FORM
// ---------------------------
const saveForm = async () => {
  hideError();

  const customerName = document.getElementById("customerName").value.trim();
  if (!customerName) {
    showError("Customer name is required.");
    return;
  }

  let homeData, branchData;
    try {
    homeData = collectTableData("home-product-table");
    branchData = collectTableData("branch-product-table");
  } catch (validationError) {
    showError(validationError.message);
    return;
  }
  const csrfToken = await getCsrfToken();

  if (homeData.length === 0 && branchData.length === 0) {
    showError(
      "Please add at least one Home or Branch product before submitting."
    );
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const pagePath = "/content/travelport/us/en/forms-info";
  const id = urlParams.get("formId");

  const servletUrl = `/bin/form/save?pagePath=${pagePath}&id=${id}`;

  const payload = {
    page_path: pagePath,
    id: id,
    products: {
      home_products: homeData,
      branch_products: branchData,
    },
  };

  try {
    const response = await fetch(servletUrl, {
      method: "PUT",
      headers: {
        "CSRF-Token": csrfToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      const redirectUrl = `/content/travelport/us/en/submissions.html`;
      window.location.href = redirectUrl;
    }
  } catch (error) {
    console.error("Save Error:", error);
  }
};



// ===============================
// LOAD INITIAL STATE
// ===============================
window.onload = async () => {
  calculateTotals();

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("formId");

  // Add default H4 only when NEW form
  if (!id) {
    const products = await fetchProducts("HOME");
    const defaultH4 = products.find((p) => p.name === "H4");
    if (defaultH4) addRowWithProduct("home-product-table", defaultH4);
  }
};

// ===============================
// EDIT MODE: POPULATE DATA
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const pagePath = "/content/travelport/us/en/forms-info"
  const id = urlParams.get("formId");

  const submitBtn = document.getElementById("submitBtn");
  const saveBtn = document.getElementById("saveBtn");

  if (id) {
    submitBtn.style.display = "none";
    saveBtn.style.display = "inline-block";

    const response = await fetch(
      `/bin/form/save?pagePath=${pagePath}&id=${id}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await response.json();

    document.getElementById("customerName").value = data.submittedBy || "";

    document.getElementById("home-product-table").innerHTML = "";
    document.getElementById("branch-product-table").innerHTML = "";

    populateProductsTable("home-product-table", data.data.home_products);
    populateProductsTable("branch-product-table", data.data.branch_products);

    calculateTotals();
  } else {
    submitBtn.style.display = "inline-block";
    saveBtn.style.display = "none";
  }

  document.querySelectorAll("td[data-date]").forEach(td => {
        td.textContent = formatSubmittedDate(td.textContent.trim());
    });

});

function populateProductsTable(tableId, products) {
  const table = document.getElementById(tableId);

  products.forEach((p) => {
    const isFixed = p.product_type === "FIXED";

    const row = document.createElement("tr");
    row.classList.add("table-row");

    row.innerHTML = `
            <td>
                <select class="input-product-name">
                    <option selected value="${p.product_name}|${p.rack_rate}|${p.product_type}">
                        ${p.product_name} (${p.product_type})
                    </option>
                </select>
            </td>

            <td>
                <input type="number" value="${p.quantity || 1}" 
                class="input-quantity text-center"
                data-rack-rate="${p.rack_rate}" 
                data-fixed="${isFixed}"
                ${isFixed ? "readonly" : ""} 
                oninput="calculateTotals()">
            </td>

            <td class="input-rack-rate text-right">${formatCurrency(p.rack_rate)}</td>

            <td>
                <input type="number" value="${p.discount_percent || 0}" min="0" max="100"
                class="input-discount text-center" oninput="calculateTotals()">
            </td>

            <td class="total-after-discount text-right">${formatCurrency(p.total_after_discount)}</td>

            <td><button onclick="removeRow(this)">Remove</button></td>
        `;

    table.appendChild(row);
  });
}

