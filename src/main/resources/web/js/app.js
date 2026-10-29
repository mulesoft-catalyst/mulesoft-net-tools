document.addEventListener("DOMContentLoaded", function() {
    var notifications = document.getElementById("notifications");
    var toolTabs = document.getElementById("toolTabs");
    var operationInput = document.getElementById("operation");
    var toolTitle = document.getElementById("toolTitle");
    var toolHelp = document.getElementById("toolHelp");
    var methodInput = document.getElementById("method");
    var output = document.getElementById("output");
    var consolePanel = document.querySelector(".console-panel");
    var wrapConsoleInput = document.getElementById("wrapConsole");
    var cleanButton = document.getElementById("clean");
    var checkButton = document.getElementById("check");
    var ipInput = document.getElementById("ip");
    var portInput = document.getElementById("port");
    var dnsServerInput = document.getElementById("dnsServer");
    var urlInput = document.getElementById("url");
    var optionsSection = document.querySelector(".options-section");
    var optionsBody = document.getElementById("optionsBody");
    var optionsToggleButton = document.getElementById("optionsToggle");
    var proxySection = document.querySelector(".proxy-section");
    var proxyBody = document.getElementById("proxyBody");
    var proxyToggleButton = document.getElementById("proxyToggle");
    var proxyEnabledInput = document.getElementById("proxyEnabled");
    var forwardProxyInput = document.getElementById("forwardProxy");
    var insecureInput = document.getElementById("insecure");
    var proxyInsecureInput = document.getElementById("proxyInsecure");
    var noProgressMeterInput = document.getElementById("noProgressMeter");
    var connectTimeoutInput = document.getElementById("connectTimeout");
    var maxTimeInput = document.getElementById("maxTime");
    var queryParamsList = document.getElementById("queryParamsList");
    var queryParamsBulk = document.getElementById("queryParamsBulk");
    var queryParamsModeToggle = document.getElementById("queryParamsModeToggle");
    var addQueryParamButton = document.getElementById("addQueryParam");
    var headersList = document.getElementById("headersList");
    var headersBulk = document.getElementById("headersBulk");
    var headersModeToggle = document.getElementById("headersModeToggle");
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
            help: "Set a URL, optional forward proxy, optional headers, TLS behavior, and HTTP method, then hit Run.",
            fields: ["method", "url", "options", "forwardProxy", "queryParams", "headers", "insecure", "proxyInsecure", "noProgressMeter"]
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
    var syncingUrl = false;
    var syncingQueryParams = false;
    var queryParamsMode = "rows";
    var headersMode = "rows";
    var optionsExpanded = false;
    var proxyExpanded = false;

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

    function setProxyExpanded(expanded) {
        proxyExpanded = expanded;
        proxyBody.classList.toggle("hidden", !proxyExpanded);
        proxyToggleButton.setAttribute("aria-expanded", proxyExpanded ? "true" : "false");
    }

    function setOptionsExpanded(expanded) {
        optionsExpanded = expanded;
        optionsBody.classList.toggle("hidden", !optionsExpanded);
        optionsToggleButton.setAttribute("aria-expanded", optionsExpanded ? "true" : "false");
    }

    function setFieldVisibility(tool) {
        document.querySelector(".field-host").classList.toggle("hidden", !hasField(tool, "host"));
        document.querySelector(".field-port").classList.toggle("hidden", !hasField(tool, "port"));
        document.querySelector(".field-dns").classList.toggle("hidden", !hasField(tool, "dns"));
        document.querySelector(".field-method").classList.toggle("hidden", !hasField(tool, "method"));
        document.querySelector(".field-url").classList.toggle("hidden", !hasField(tool, "url"));
        optionsSection.classList.toggle("hidden", !hasField(tool, "options"));
        proxySection.classList.toggle("hidden", !hasField(tool, "forwardProxy"));
        document.querySelector(".field-query-params").classList.toggle("hidden", !hasField(tool, "queryParams"));
        document.querySelector(".field-headers").classList.toggle("hidden", !hasField(tool, "headers"));
        document.querySelector(".field-insecure").classList.toggle("hidden", !hasField(tool, "insecure"));
        document.querySelector(".field-no-progress-meter").classList.toggle("hidden", !hasField(tool, "noProgressMeter"));
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
            setOptionsExpanded(false);
            setProxyExpanded(false);
        }

        setFieldVisibility(currentTool);
    }

    function toolFromHash() {
        var operation = window.location.hash.replace(/^#/, "");
        return toolByOperation[operation] ? operation : "ping";
    }

    function selectToolFromHash() {
        var operation = toolFromHash();

        if (window.location.hash !== "#" + operation) {
            window.history.replaceState(null, "", "#" + operation);
        }
        selectTool(operation);
    }

    function setToolHash(operation) {
        if (!toolByOperation[operation]) {
            operation = "ping";
        }
        if (window.location.hash === "#" + operation) {
            selectTool(operation);
            return;
        }
        window.location.hash = operation;
    }

    function readPositiveIntegerInput(input) {
        var value = input.value.trim();
        var numberValue;

        if (!value) {
            return null;
        }

        numberValue = Number(value);
        if (!Number.isFinite(numberValue) || numberValue <= 0 || !Number.isInteger(numberValue)) {
            return null;
        }
        return numberValue;
    }

    function hasInvalidPositiveIntegerInput(input) {
        return input.value.trim() !== "" && readPositiveIntegerInput(input) === null;
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

        if (operation === "curl" && hasInvalidPositiveIntegerInput(connectTimeoutInput)) {
            notifyError("Connect timeout must be a positive integer", "Invalid Arguments");
            console.error("Invalid connect timeout!");
            return false;
        }

        if (operation === "curl" && hasInvalidPositiveIntegerInput(maxTimeInput)) {
            notifyError("Max time must be a positive integer", "Invalid Arguments");
            console.error("Invalid max time!");
            return false;
        }

        return true;
    }

    function splitUrl(value) {
        var url = value || "";
        var hashIndex = url.indexOf("#");
        var hash = "";
        var beforeHash = url;
        var queryIndex;

        if (hashIndex >= 0) {
            hash = url.slice(hashIndex);
            beforeHash = url.slice(0, hashIndex);
        }

        queryIndex = beforeHash.indexOf("?");
        if (queryIndex < 0) {
            return {
                base: beforeHash,
                query: "",
                hash: hash
            };
        }

        return {
            base: beforeHash.slice(0, queryIndex),
            query: beforeHash.slice(queryIndex + 1),
            hash: hash
        };
    }

    function ensureQueryParamPlaceholder() {
        if (!queryParamsList.children.length) {
            addQueryParamRow("", "", true, true);
        }
    }

    function parseBulkPairs(value, delimiter) {
        var params = [];

        (value || "").split(/\r?\n/).forEach(function(line) {
            var index;
            var name;
            var pairValue;

            line = line.trim();
            if (!line) {
                return;
            }

            index = line.indexOf(delimiter);
            if (index < 0) {
                return;
            }

            name = line.slice(0, index).trim();
            pairValue = line.slice(index + delimiter.length).trim();
            if (!name || !pairValue) {
                return;
            }

            params.push({
                name: name,
                value: pairValue
            });
        });

        return params;
    }

    function formatBulkPairs(params, delimiter) {
        return params.map(function(param) {
            return param.name + delimiter + param.value;
        }).join("\n");
    }

    function collectQueryParamsFromRows() {
        var params = [];

        queryParamsList.querySelectorAll(".curl-pair-row").forEach(function(row) {
            var enabledInput = row.querySelector('input[type="checkbox"]');
            var name = row.querySelector(".query-param-name").value.trim();
            var value = row.querySelector(".query-param-value").value.trim();

            if (!enabledInput.checked || !name || !value) {
                return;
            }

            params.push({
                name: name,
                value: value
            });
        });

        return params;
    }

    function collectQueryParams() {
        if (queryParamsMode === "bulk") {
            return parseBulkPairs(queryParamsBulk.value, "=");
        }

        return collectQueryParamsFromRows();
    }

    function replaceQueryParamRows(params) {
        queryParamsList.replaceChildren();
        params.forEach(function(param) {
            addQueryParamRow(param.name, param.value, true, true);
        });
        ensureQueryParamPlaceholder();
    }

    function renderQueryParams(params) {
        if (queryParamsMode === "bulk") {
            queryParamsBulk.value = formatBulkPairs(params, "=");
            return;
        }

        replaceQueryParamRows(params);
    }

    function syncUrlFromQueryParams() {
        var urlParts;
        var searchParams;
        var queryString;

        if (syncingQueryParams) {
            return;
        }

        syncingUrl = true;
        urlParts = splitUrl(urlInput.value);
        searchParams = new URLSearchParams();
        collectQueryParams().forEach(function(param) {
            searchParams.append(param.name, param.value);
        });
        queryString = searchParams.toString();
        urlInput.value = urlParts.base + (queryString ? "?" + queryString : "") + urlParts.hash;
        syncingUrl = false;
    }

    function syncQueryParamsFromUrl() {
        var urlParts;
        var searchParams;
        var params = [];

        if (syncingUrl) {
            return;
        }

        syncingQueryParams = true;
        urlParts = splitUrl(urlInput.value);
        searchParams = new URLSearchParams(urlParts.query);
        searchParams.forEach(function(value, name) {
            if (!name || !value) {
                return;
            }
            params.push({
                name: name,
                value: value
            });
        });
        renderQueryParams(params);
        syncingQueryParams = false;
    }

    function addQueryParamRow(name, value, enabled, skipSync) {
        var row = document.createElement("div");
        var enabledInput = document.createElement("input");
        var nameInput = document.createElement("input");
        var valueInput = document.createElement("input");
        var removeButton = document.createElement("button");

        row.className = "curl-pair-row";
        enabledInput.type = "checkbox";
        enabledInput.checked = enabled !== false;
        enabledInput.title = "Enable query parameter";
        nameInput.type = "text";
        nameInput.placeholder = "Name";
        nameInput.value = name || "";
        nameInput.className = "query-param-name";
        valueInput.type = "text";
        valueInput.placeholder = "Value";
        valueInput.value = value || "";
        valueInput.className = "query-param-value";
        removeButton.type = "button";
        removeButton.className = "icon-button";
        removeButton.textContent = "X";
        removeButton.title = "Remove query parameter";
        removeButton.addEventListener("click", function() {
            row.remove();
            ensureQueryParamPlaceholder();
            syncUrlFromQueryParams();
        });
        enabledInput.addEventListener("change", syncUrlFromQueryParams);
        nameInput.addEventListener("input", syncUrlFromQueryParams);
        valueInput.addEventListener("input", syncUrlFromQueryParams);
        row.append(enabledInput, nameInput, valueInput, removeButton);
        queryParamsList.append(row);

        if (!skipSync) {
            syncUrlFromQueryParams();
        }
    }

    function addHeaderRow(name, value, enabled, managedContentType) {
        var row = document.createElement("div");
        var enabledInput = document.createElement("input");
        var nameInput = document.createElement("input");
        var valueInput = document.createElement("input");

        row.className = "curl-pair-row curl-header-row";
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

    function collectHeaderPairsFromRows() {
        var params = [];

        headersList.querySelectorAll(".curl-header-row").forEach(function(row) {
            var enabledInput = row.querySelector('input[type="checkbox"]');
            var name = row.querySelector(".header-name").value.trim();
            var value = row.querySelector(".header-value").value.trim();

            if (row.dataset.managedHeader === "content-type") {
                return;
            }

            if (!enabledInput.checked || !name || !value) {
                return;
            }

            params.push({
                name: name,
                value: value
            });
        });

        return params;
    }

    function collectHeaderPairs() {
        if (headersMode === "bulk") {
            return parseBulkPairs(headersBulk.value, ":");
        }

        return collectHeaderPairsFromRows();
    }

    function replaceHeaderRows(params) {
        headersList.replaceChildren();
        params.forEach(function(param) {
            if (currentTool.operation === "curl" && methodInput.value === "POST" && param.name.toLowerCase() === "content-type") {
                return;
            }
            addHeaderRow(param.name, param.value, true);
        });
        if (!headersList.children.length) {
            addHeaderRow("", "", true);
        }
        syncContentTypeHeader();
    }

    function setQueryParamsMode(mode) {
        var params = collectQueryParams();

        queryParamsMode = mode;
        queryParamsList.classList.toggle("hidden", mode !== "rows");
        addQueryParamButton.classList.toggle("hidden", mode !== "rows");
        queryParamsBulk.classList.toggle("hidden", mode !== "bulk");
        queryParamsModeToggle.textContent = mode === "rows" ? "Bulk" : "Rows";
        renderQueryParams(params);
        syncUrlFromQueryParams();
    }

    function setHeadersMode(mode) {
        var params = collectHeaderPairs();

        headersMode = mode;
        headersList.classList.toggle("hidden", mode !== "rows");
        addHeaderButton.classList.toggle("hidden", mode !== "rows");
        headersBulk.classList.toggle("hidden", mode !== "bulk");
        headersModeToggle.textContent = mode === "rows" ? "Bulk" : "Rows";
        if (mode === "bulk") {
            headersBulk.value = formatBulkPairs(params, ": ");
            return;
        }

        replaceHeaderRows(params);
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
            headers.push("Content-Type:" + contentTypeInput.value);
        }
        collectHeaderPairs().forEach(function(param) {
            if (includeContentType && param.name.toLowerCase() === "content-type") {
                return;
            }

            headers.push(param.name + ":" + param.value);
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
        var forwardProxy;
        var connectTimeout;
        var maxTime;

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
            request.proxyInsecure = proxyEnabledInput.checked && proxyInsecureInput.checked;
            request.noProgressMeter = noProgressMeterInput.checked;
            request.targetMethod = methodInput.value;
            request.headers = collectHeaders(request.targetMethod === "POST");
            connectTimeout = readPositiveIntegerInput(connectTimeoutInput);
            maxTime = readPositiveIntegerInput(maxTimeInput);
            if (connectTimeout !== null) {
                request.connectTimeout = connectTimeout;
            }
            if (maxTime !== null) {
                request.maxTime = maxTime;
            }
            forwardProxy = forwardProxyInput.value.trim();
            if (proxyEnabledInput.checked && forwardProxy) {
                request.forwardProxy = forwardProxy;
            }
            if (request.targetMethod === "POST") {
                request.body = bodyInput.value;
            }
        }

        return request;
    }

    function maskProxyCredential(value) {
        var schemeSeparatorIndex = value.indexOf("://");
        var authorityStartIndex = schemeSeparatorIndex >= 0 ? schemeSeparatorIndex + 3 : 0;
        var authorityEndIndex = value.indexOf("/", authorityStartIndex);
        var authority = authorityEndIndex >= 0 ? value.slice(authorityStartIndex, authorityEndIndex) : value.slice(authorityStartIndex);
        var atIndex = authority.lastIndexOf("@");
        var colonIndex;
        var maskedAuthority;

        if (atIndex < 0) {
            return value;
        }

        colonIndex = authority.indexOf(":");
        if (colonIndex < 0 || colonIndex > atIndex) {
            return value;
        }

        maskedAuthority = authority.slice(0, colonIndex + 1) + "****" + authority.slice(atIndex);
        return value.slice(0, authorityStartIndex) + maskedAuthority + (authorityEndIndex >= 0 ? value.slice(authorityEndIndex) : "");
    }

    function formatCommandArg(value) {
        value = String(value);
        if (!value) {
            return "''";
        }
        if (!/[\s'"\\$`]/.test(value)) {
            return value;
        }
        return "'" + value.replace(/'/g, "'\\''") + "'";
    }

    function buildConsoleCommand(operation, ip, port, url) {
        var commandParts = [operation, ip, port];
        var proxyEnabled = operation === "curl" && proxyEnabledInput.checked;
        var forwardProxy = proxyEnabled ? forwardProxyInput.value.trim() : "";
        var connectTimeout = operation === "curl" ? connectTimeoutInput.value.trim() : "";
        var maxTime = operation === "curl" ? maxTimeInput.value.trim() : "";
        var headers;

        if (operation === "curl" && noProgressMeterInput.checked) {
            commandParts.push("--no-progress-meter");
        }

        if (operation === "curl" && insecureInput.checked) {
            commandParts.push("-k");
        }

        if (operation === "curl" && connectTimeout) {
            commandParts.push("--connect-timeout");
            commandParts.push(formatCommandArg(connectTimeout));
        }

        if (operation === "curl" && maxTime) {
            commandParts.push("--max-time");
            commandParts.push(formatCommandArg(maxTime));
        }

        if (proxyEnabled && proxyInsecureInput.checked) {
            commandParts.push("--proxy-insecure");
        }

        if (operation === "curl" && forwardProxy) {
            commandParts.push("-x");
            commandParts.push(formatCommandArg(maskProxyCredential(forwardProxy)));
        }

        if (operation === "curl") {
            commandParts.push("-i");
            commandParts.push("-L");
        }

        if (operation === "curl") {
            commandParts.push(formatCommandArg(url));
            headers = collectHeaders(methodInput.value === "POST");
            headers.forEach(function(header) {
                commandParts.push("-H");
                commandParts.push(formatCommandArg(header));
            });

            if (methodInput.value === "POST") {
                commandParts.push("-d");
                commandParts.push(formatCommandArg(bodyInput.value));
            }
        }

        return commandParts.filter(Boolean).join(" ");
    }

    function appendCommand(operation, ip, port, url) {
        var emptyMessage = output.querySelector(".console-empty");
        var command = document.createElement("pre");

        if (emptyMessage) {
            emptyMessage.remove();
        }

        command.className = "command";
        command.textContent = "> " + buildConsoleCommand(operation, ip, port, url);
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

    function updateConsoleWrapMode() {
        output.classList.toggle("no-wrap", !wrapConsoleInput.checked);
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
            setToolHash(tab.dataset.operation);
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

    headersModeToggle.addEventListener("click", function() {
        setHeadersMode(headersMode === "rows" ? "bulk" : "rows");
    });

    headersBulk.addEventListener("input", function() {
        if (headersMode === "bulk") {
            syncContentTypeHeader();
        }
    });

    optionsToggleButton.addEventListener("click", function() {
        setOptionsExpanded(!optionsExpanded);
    });

    proxyToggleButton.addEventListener("click", function() {
        setProxyExpanded(!proxyExpanded);
    });

    addQueryParamButton.addEventListener("click", function() {
        addQueryParamRow("", "", true);
    });

    queryParamsModeToggle.addEventListener("click", function() {
        setQueryParamsMode(queryParamsMode === "rows" ? "bulk" : "rows");
    });

    queryParamsBulk.addEventListener("input", function() {
        syncUrlFromQueryParams();
    });

    urlInput.addEventListener("input", function() {
        syncQueryParamsFromUrl();
    });

    formatBodyButton.addEventListener("click", function() {
        formatBody();
    });

    cleanButton.addEventListener("click", function() {
        resetConsole();
    });

    wrapConsoleInput.addEventListener("change", function() {
        updateConsoleWrapMode();
    });

    window.addEventListener("resize", function() {
        updateConsoleMaxHeight();
    });

    window.addEventListener("hashchange", selectToolFromHash);

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

        console.log(buildConsoleCommand(operation, ip, port, url));
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
    addQueryParamRow("", "", true, true);
    setHeadersMode("bulk");
    setQueryParamsMode("bulk");
    selectToolFromHash();
    updateConsoleWrapMode();
    updateConsoleMaxHeight();
});
