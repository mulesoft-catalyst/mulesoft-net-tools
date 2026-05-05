document.addEventListener("DOMContentLoaded", function() {
    var notifications = document.getElementById("notifications");
    var toolTabs = document.getElementById("toolTabs");
    var operationInput = document.getElementById("operation");
    var toolTitle = document.getElementById("toolTitle");
    var toolHelp = document.getElementById("toolHelp");
    var methodInput = document.getElementById("method");
    var output = document.getElementById("output");
    var consolePanel = document.querySelector(".console-panel");
    var cleanButton = document.getElementById("clean");
    var checkButton = document.getElementById("check");
    var ipInput = document.getElementById("ip");
    var portInput = document.getElementById("port");
    var dnsServerInput = document.getElementById("dnsServer");
    var urlInput = document.getElementById("url");
    var insecureInput = document.getElementById("insecure");
    var headersList = document.getElementById("headersList");
    var addHeaderButton = document.getElementById("addHeader");
    var contentTypeInput = document.getElementById("contentType");
    var formatBodyButton = document.getElementById("formatBody");
    var bodyInput = document.getElementById("body");

    var tools = [
        {
            operation: "ping",
            label: "Ping",
            help: "Set an IP Address or Hostname and hit Run. Note: Ping works using ICMP protocol and is not supported on CloudHub 2.0. If ICMP has been disabled, the ping will not receive any response.",
            fields: ["host"]
        },
        {
            operation: "traceroute",
            label: "Traceroute",
            help: "Set an IP Address or Hostname and hit Run.",
            fields: ["host"]
        },
        {
            operation: "socket",
            label: "Socket",
            help: "Set an IP Address or Hostname, the Port and hit Run.",
            fields: ["host", "port"]
        },
        {
            operation: "dns",
            label: "DNS",
            help: "Set a Hostname and hit Run. Optionally set a DNS server.",
            fields: ["host", "dns"]
        },
        {
            operation: "curl",
            label: "curl",
            help: "Set a URL, optional headers, TLS behavior, and HTTP method, then hit Run.",
            fields: ["method", "url", "headers", "insecure"]
        },
        {
            operation: "certest",
            label: "Certificates",
            help: "Set an IP Address or Hostname, the Port and hit Run.",
            fields: ["host", "port"]
        },
        {
            operation: "ciphertest",
            label: "SSL Ciphers",
            help: "Set an IP Address or Hostname, the Port and hit Run.",
            fields: ["host", "port"]
        }
    ];

    var toolByOperation = {};
    var currentTool = tools[0];

    function clearNotification() {
        notifications.replaceChildren();
    }

    function notifyError(message, title) {
        var notification = document.createElement("div");
        var notificationTitle = document.createElement("strong");
        var notificationMessage = document.createElement("span");

        notification.className = "notification";
        notificationTitle.textContent = title || "Error";
        notificationMessage.textContent = message;
        notification.append(notificationTitle, notificationMessage);

        notifications.replaceChildren(notification);
        window.setTimeout(function() {
            notification.classList.add("is-hiding");
            window.setTimeout(function() {
                notification.remove();
            }, 160);
        }, 5000);
    }

    function hasField(tool, field) {
        return tool.fields.indexOf(field) >= 0;
    }

    function setFieldVisibility(tool) {
        document.querySelector(".field-host").classList.toggle("hidden", !hasField(tool, "host"));
        document.querySelector(".field-port").classList.toggle("hidden", !hasField(tool, "port"));
        document.querySelector(".field-dns").classList.toggle("hidden", !hasField(tool, "dns"));
        document.querySelector(".field-method").classList.toggle("hidden", !hasField(tool, "method"));
        document.querySelector(".field-url").classList.toggle("hidden", !hasField(tool, "url"));
        document.querySelector(".field-headers").classList.toggle("hidden", !hasField(tool, "headers"));
        document.querySelector(".field-insecure").classList.toggle("hidden", !hasField(tool, "insecure"));
        updateBodyVisibility();
    }

    function updateBodyVisibility() {
        var showBody = currentTool.operation === "curl" && methodInput.value === "POST";
        document.querySelector(".field-body").classList.toggle("hidden", !showBody);
        updateFormatButtonState();
        syncContentTypeHeader();
    }

    function selectTool(operation) {
        currentTool = toolByOperation[operation] || tools[0];
        operationInput.value = currentTool.operation;
        toolTitle.textContent = currentTool.label;
        toolHelp.textContent = currentTool.help;
        document.querySelectorAll(".tool-tab").forEach(function(tab) {
            tab.classList.remove("active");
            tab.setAttribute("aria-selected", "false");
        });
        document.querySelectorAll(".tool-tab").forEach(function(tab) {
            if (tab.dataset.operation === currentTool.operation) {
                tab.classList.add("active");
                tab.setAttribute("aria-selected", "true");
            }
        });

        if (currentTool.operation === "curl") {
            methodInput.value = "GET";
        }

        setFieldVisibility(currentTool);
    }

    function validateRequest(operation, ip, port, url) {
        if (operation !== "curl" && !ip) {
            notifyError("Missing IP", "Invalid Arguments");
            console.error("Missing IP!");
            return false;
        }

        if ((operation === "socket" || operation === "certest" || operation === "ciphertest") && !port) {
            notifyError("Missing port", "Invalid Arguments");
            console.error("Missing port!");
            return false;
        }

        if (operation === "curl" && !url) {
            notifyError("Missing url", "Invalid Arguments");
            console.error("Missing url!");
            return false;
        }

        return true;
    }

    function addHeaderRow(name, value, enabled, managedContentType) {
        var row = document.createElement("div");
        var enabledInput = document.createElement("input");
        var nameInput = document.createElement("input");
        var valueInput = document.createElement("input");

        row.className = "curl-header-row";
        if (managedContentType) {
            row.classList.add("is-managed");
            row.dataset.managedHeader = "content-type";
        }
        enabledInput.type = "checkbox";
        enabledInput.checked = enabled !== false;
        enabledInput.title = "Enable header";
        nameInput.type = "text";
        nameInput.placeholder = "Name";
        nameInput.value = name || "";
        nameInput.className = "header-name";
        nameInput.readOnly = !!managedContentType;
        valueInput.type = "text";
        valueInput.placeholder = "Value";
        valueInput.value = value || "";
        valueInput.className = "header-value";
        valueInput.readOnly = !!managedContentType;
        row.append(enabledInput, nameInput, valueInput);
        if (!managedContentType) {
            var removeButton = document.createElement("button");

            removeButton.type = "button";
            removeButton.className = "icon-button";
            removeButton.textContent = "X";
            removeButton.title = "Remove header";
            removeButton.addEventListener("click", function() {
                row.remove();
            });
            row.append(removeButton);
        }

        if (managedContentType) {
            headersList.prepend(row);
        } else {
            headersList.append(row);
        }
    }

    function syncContentTypeHeader() {
        var managedRow = headersList.querySelector('[data-managed-header="content-type"]');
        var shouldShow = currentTool.operation === "curl" && methodInput.value === "POST";

        if (!shouldShow) {
            if (managedRow) {
                managedRow.remove();
            }
            return;
        }

        if (managedRow) {
            managedRow.querySelector(".header-name").value = "Content-Type";
            managedRow.querySelector(".header-value").value = contentTypeInput.value;
            headersList.prepend(managedRow);
            return;
        }

        addHeaderRow("Content-Type", contentTypeInput.value, true, true);
    }

    function updateFormatButtonState() {
        var canFormat = contentTypeInput.value === "application/json" || contentTypeInput.value === "application/xml";

        formatBodyButton.disabled = !canFormat;
    }

    function collectHeaders(includeContentType) {
        var headers = [];

        if (includeContentType) {
            syncContentTypeHeader();
        }
        headersList.querySelectorAll(".curl-header-row").forEach(function(row) {
            var enabledInput = row.querySelector('input[type="checkbox"]');
            var name = row.querySelector(".header-name").value.trim();
            var value = row.querySelector(".header-value").value.trim();

            if (!enabledInput.checked || !name || !value) {
                return;
            }

            headers.push(name + ":" + value);
        });

        return headers;
    }

    function formatXml(xml) {
        var parser = new DOMParser();
        var documentNode = parser.parseFromString(xml, "application/xml");
        var parseError = documentNode.querySelector("parsererror");
        var formatted = "";
        var padding = 0;

        if (parseError) {
            throw new Error("Invalid XML");
        }

        new XMLSerializer()
            .serializeToString(documentNode)
            .replace(/>\s*</g, "><")
            .replace(/(>)(<)(\/*)/g, "$1\n$2$3")
            .split("\n")
            .forEach(function(line) {
                if (line.match(/^<\/\w/)) {
                    padding -= 1;
                }
                formatted += new Array(Math.max(padding, 0) + 1).join("  ") + line + "\n";
                if (line.match(/^<\w[^>]*[^/]>/) && !line.match(/<\/\w+>$/)) {
                    padding += 1;
                }
            });

        return formatted.trim();
    }

    function formatBody() {
        var contentType = contentTypeInput.value;

        clearNotification();
        if (formatBodyButton.disabled) {
            return;
        }

        if (contentType === "application/json") {
            try {
                bodyInput.value = JSON.stringify(JSON.parse(bodyInput.value), null, 2);
            } catch (error) {
                notifyError("Invalid JSON body", "Format failed");
            }
            return;
        }

        if (contentType === "application/xml") {
            try {
                bodyInput.value = formatXml(bodyInput.value);
            } catch (error) {
                notifyError("Invalid XML body", "Format failed");
            }
            return;
        }

        notifyError("Format is not available for this Content-Type", "Format unavailable");
    }

    function buildRequest(operation, ip, port, dnsServer, url) {
        var request = {
            operation: operation
        };

        if (operation !== "curl") {
            request.host = ip;
        }

        if (operation === "socket" || operation === "certest" || operation === "ciphertest") {
            request.port = port;
        }

        if (operation === "dns") {
            request.dnsServer = dnsServer;
        }

        if (operation === "curl") {
            request.url = url;
            request.insecure = insecureInput.checked;
            request.targetMethod = methodInput.value;
            request.headers = collectHeaders(request.targetMethod === "POST");
            if (request.targetMethod === "POST") {
                request.body = bodyInput.value;
            }
        }

        return request;
    }

    function appendCommand(operation, ip, port, url) {
        var emptyMessage = output.querySelector(".console-empty");
        var command = document.createElement("pre");

        if (emptyMessage) {
            emptyMessage.remove();
        }

        command.className = "command";
        command.textContent = "> " + operation + " " + ip + " " + port + " " + url;
        output.append(command);
        updateConsoleMaxHeight();
        output.scrollTop = output.scrollHeight;
    }

    function appendResult(operation, result) {
        var resultElement = document.createElement("pre");

        resultElement.className = "output";
        resultElement.textContent = result;
        output.append(resultElement);
        updateConsoleMaxHeight();
        output.scrollTop = output.scrollHeight;
    }

    function resetConsole() {
        var emptyMessage = document.createElement("div");

        emptyMessage.className = "console-empty";
        emptyMessage.textContent = "No commands have been run.";
        output.replaceChildren(emptyMessage);
        updateConsoleMaxHeight();
    }

    function updateConsoleMaxHeight() {
        var viewportPadding = 40;
        var top = output.getBoundingClientRect().top;
        var maxHeight = Math.max(420, window.innerHeight - top - viewportPadding);

        consolePanel.style.setProperty("--console-max-height", maxHeight + "px");
    }

    tools.forEach(function(tool) {
        var tab = document.createElement("button");

        toolByOperation[tool.operation] = tool;
        tab.type = "button";
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", "false");
        tab.dataset.operation = tool.operation;
        tab.className = "tool-tab";
        tab.textContent = tool.label;
        toolTabs.append(tab);
    });

    toolTabs.addEventListener("click", function(event) {
        var tab = event.target.closest(".tool-tab");

        if (tab && toolTabs.contains(tab)) {
            selectTool(tab.dataset.operation);
        }
    });

    methodInput.addEventListener("change", function() {
        updateBodyVisibility();
    });

    contentTypeInput.addEventListener("change", function() {
        updateFormatButtonState();
        syncContentTypeHeader();
    });

    addHeaderButton.addEventListener("click", function() {
        addHeaderRow("", "", true);
    });

    formatBodyButton.addEventListener("click", function() {
        formatBody();
    });

    cleanButton.addEventListener("click", function() {
        resetConsole();
    });

    window.addEventListener("resize", function() {
        updateConsoleMaxHeight();
    });

    checkButton.addEventListener("click", function() {
        var operation = operationInput.value;
        var ip = ipInput.value;
        var port = (operation === "socket" || operation === "certest" || operation === "ciphertest") ? portInput.value : "";
        var dnsServer = operation === "dns" ? dnsServerInput.value : "";
        var url = operation === "curl" ? urlInput.value : "";

        clearNotification();

        if (!validateRequest(operation, ip, port, url)) {
            return;
        }

        var request = buildRequest(operation, ip, port, dnsServer, url);

        console.log(operation + " " + ip + " " + port + " " + url);
        checkButton.disabled = true;
        appendCommand(operation, ip, port, url);

        fetch("api/tools", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error("Request failed with status " + response.status);
            }
            return response.text();
        })
        .then(function(result) {
            appendResult(operation, result);
        })
        .catch(function() {
            notifyError("Couldn't complete request", "Error during invocation");
        })
        .finally(function() {
            checkButton.disabled = false;
        });
    });

    addHeaderRow("", "", true);
    selectTool("ping");
    updateConsoleMaxHeight();
});
