package com.mulesoft.tool.network;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.io.SequenceInputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLEncoder;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import javax.naming.directory.InvalidAttributeValueException;

// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.BufferedWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class NetworkUtils {

	private static final String ERROR_HOST_PAT = "Error: '%s' is not a valid hostname or IP address.";
	private static final String ERROR_PORT_PAT = "Error: '%s' is not a valid port number (must be an integer between 1 and 65535).";
    // private static final Logger log = LoggerFactory.getLogger(NetworkUtils.class);

	public static String ping(String host) throws Exception {
		if (!isValidHost(host)) {
			return String.format(ERROR_HOST_PAT, host);
		}
		return execute(new ProcessBuilder("ping", "-c", "4", host));
	}

	public static String resolveIPs(String host, String dnsServer) throws UnknownHostException {
		if (!isValidHost(host)) {
			return String.format(ERROR_HOST_PAT, host);
		}
		if (dnsServer == null || dnsServer.isEmpty() || dnsServer.equals("default"))
		{
			InetAddress[] addresses = InetAddress.getAllByName(host);
			StringBuilder sb = new StringBuilder();
			for (int i = 0; i < addresses.length; i++) {
				if (i != 0) {
					sb.append("\n");
				}
				sb.append(addresses[i].getHostAddress());
			}
			return sb.toString();
		}
		else {
			if (!isValidHost(dnsServer)) {
				return String.format(ERROR_HOST_PAT, dnsServer);
			}
			dnsServer = "@" + dnsServer;
			try {
				return execute(new ProcessBuilder("dig", "+short", dnsServer, host));
			} catch (IOException e) {
				return e.getMessage();
			}
		}
	}

	public static String curl(String url, String[] headers, String body, Map<String, Object> options, Map<String, Object> proxy) throws IOException {
		Path tempFile = null;

		try {
			List<String> command = buildCurlCommand(url, headers, options, proxy);
			if(body != null) {
				tempFile = Files.createTempFile("body", ".txt");
				Files.write(tempFile, body.getBytes(StandardCharsets.UTF_8));
				command.add("-d");
				command.add("@" + tempFile.toAbsolutePath());
			}
			return execute(new ProcessBuilder(command));
		} catch (InvalidAttributeValueException iave) {
			return iave.getExplanation();
		} catch (NumberFormatException nfe){
			return "Time is not a number";
		}finally {
            if (tempFile != null && Files.exists(tempFile.toAbsolutePath())) {
                Files.delete(tempFile.toAbsolutePath());
            }
		}		
	}

	private static List<String> buildCurlCommand(String url, String[] headers, Map<String, Object> options, Map<String, Object> proxy) throws InvalidAttributeValueException {
		//-i include protocol headers
		//-L follow redirects
		//-k insecure
		//--no-progress-meter suppress progress output
		//--connect-timeout maximum time allowed for connection
		//--max-time maximum total time allowed for the request
		//-x use the specified forward proxy
		//--proxy-insecure allow insecure TLS connections to HTTPS proxies
		List<String> command = new ArrayList<String>();
		String connectTimeout = stringOption(options, "connectTimeout");
		String forwardProxy = stringOption(proxy, "url");
		String maxTime = stringOption(options, "maxTime");
		command.add("curl");
		if(booleanOption(options, "noProgressMeter")) command.add("--no-progress-meter");
		if(booleanOption(options, "insecure")) command.add("-k");
		if(connectTimeout != null && !connectTimeout.trim().isEmpty()) {
			command.add("--connect-timeout");
			command.add(Integer.toUnsignedString(Integer.parseInt(connectTimeout.trim())));
		}
		if(maxTime != null && !maxTime.trim().isEmpty()) {
			command.add("--max-time");
			command.add(Integer.toUnsignedString(Integer.parseInt(maxTime.trim())));
		}
		if(booleanOption(proxy, "insecure")) command.add("--proxy-insecure");
		if(forwardProxy != null && !forwardProxy.trim().isEmpty()) {
			if(!isValidUrl(forwardProxy.trim())){
				throw new InvalidAttributeValueException("Error: '" + forwardProxy + "' is not a valid URL.");
			}
			command.add("-x");
			command.add(forwardProxy.trim());
		}
		command.add("-i");
		command.add("-L");
		command.add(url);
		for (String header : headers ) {
			if (!isValidHeader(header)) {
				throw new InvalidAttributeValueException("Error: '" + header + "' is not a valid HTTP header value.");
			}
			command.add("-H");
			command.add(header);
		}
		return command;
	}

	private static boolean booleanOption(Map<String, Object> options, String key) {
		if(options == null) {
			return false;
		}
		Object option = options.get(key);
		if(option instanceof Boolean) {
			return (Boolean) option;
		}
		return option != null && Boolean.valueOf(option.toString());
	}

	private static String stringOption(Map<String, Object> options, String key) {
		if(options == null || options.get(key) == null) {
			return "";
		}
		return options.get(key).toString();
	}

	public static String testConnect(String host, String port) {
		if (!isValidHost(host)) {
			return String.format(ERROR_HOST_PAT, host);
		}
		if (!isValidPort(port)) {
			return String.format(ERROR_PORT_PAT, port);
		}
		long startTime = System.nanoTime();
		long totalTime = System.nanoTime();
		String result = "";
		for (int x = 1; x <= 5; x++) {
			try {
				Socket socket = new Socket();
				startTime = System.nanoTime();
				socket.connect(new InetSocketAddress(host, Integer.parseInt(port)), 10000);
				socket.setSoTimeout(10000);
				if (socket.isConnected()) {
					totalTime = System.nanoTime() - startTime;
					socket.getInputStream();
				}
				socket.close();
			}
			catch (java.net.UnknownHostException e) {
				return "Could not resolve host " + host;
			}
			catch (java.net.SocketTimeoutException e) {
				return "Timeout while trying to connect to " + host;
			}
			catch (java.lang.IllegalArgumentException e) {
				return e.getMessage();
			}
			catch (Exception e) {
				ByteArrayOutputStream b = new ByteArrayOutputStream();
				e.printStackTrace(new PrintStream(b));
				return b.toString();
			}
			result = result + "Probe " + x + ": Connection successful, RTT=" + Long.toString(totalTime/1000000) + "ms\n";
		}
		return result + "socket test completed";
	}

	public static String traceRoute(String host) throws Exception {
		if (!isValidHost(host)) {
			return String.format(ERROR_HOST_PAT, host);
		}
		return execute(new ProcessBuilder("traceroute", "-w", "3", "-q", "1", "-m", "18", "-n", host));
	}

	public static String certest(String host, String port) throws Exception {
		if (!isValidHost(host)) {
			return String.format(ERROR_HOST_PAT, host);
		}
		if (!isValidPort(port)) {
			return String.format(ERROR_PORT_PAT, port);
		}
		return execute(new ProcessBuilder("openssl", "s_client", "-showcerts", "-servername", host, "-connect", host+":"+port));
	}

	public static String cipherTest(String host, String port) throws Exception {
		if (!isValidHost(host)) {
			return String.format(ERROR_HOST_PAT, host);
		}
		if (!isValidPort(port)) {
			return String.format(ERROR_PORT_PAT, port);
		}
		String remoteEndpointSupportedCiphers = "List of supported ciphers:\n\n";
		String[] openSslAvailableCiphers = execute(new ProcessBuilder("openssl","ciphers","ALL:!eNULL")).split(":");

		for (String cipher : openSslAvailableCiphers) {
			if (execute(new ProcessBuilder("openssl", "s_client", "-cipher", cipher, "-servername", host, "-connect", host+":"+port)).contains("BEGIN CERTIFICATE")) {
				remoteEndpointSupportedCiphers = remoteEndpointSupportedCiphers + cipher + ": YES\n";
			} else {
				remoteEndpointSupportedCiphers = remoteEndpointSupportedCiphers + cipher + ": NO\n";
			}
		}
		return remoteEndpointSupportedCiphers;
	}

	private static String execute(ProcessBuilder pb) throws IOException {
		Process p = pb.start();
		OutputStream stdin = p.getOutputStream();
		BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(stdin));
		writer.write("\n");
        writer.flush();
        writer.close();
		SequenceInputStream sis = new SequenceInputStream(p.getInputStream(), p.getErrorStream());
		java.util.Scanner s = new java.util.Scanner(sis).useDelimiter("\\A");
		return s.hasNext() ? s.next() : "";
	}

	/**
	 * Validates that the given value is a valid hostname or IP address.
	 * Accepts: IPv4 addresses, IPv6 addresses, and RFC 1123-compliant hostnames.
	 *
	 * @param host the hostname or IP address to validate
	 * @return true if the value is a valid host, false otherwise
	 */
	public static boolean isValidHost(String host) {
		if (host == null || host.trim().isEmpty()) {
			return false;
		}

		// IPv4 validation
		String ipv4Pattern = "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}"
				+ "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$";
		if (host.matches(ipv4Pattern)) {
			return true;
		}

		// IPv6 validation (covers full, compressed, and loopback forms)
		String ipv6Pattern = "^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$"
				+ "|^(([0-9a-fA-F]{1,4}:){1,7}:)$"
				+ "|^:(:[0-9a-fA-F]{1,4}){1,7}$"
				+ "|^::$"
				+ "|^(([0-9a-fA-F]{1,4}:){1,6})(:[0-9a-fA-F]{1,4})$"
				+ "|^(([0-9a-fA-F]{1,4}:){1,5})(:[0-9a-fA-F]{1,4}){1,2}$"
				+ "|^(([0-9a-fA-F]{1,4}:){1,4})(:[0-9a-fA-F]{1,4}){1,3}$"
				+ "|^(([0-9a-fA-F]{1,4}:){1,3})(:[0-9a-fA-F]{1,4}){1,4}$"
				+ "|^(([0-9a-fA-F]{1,4}:){1,2})(:[0-9a-fA-F]{1,4}){1,5}$"
				+ "|^([0-9a-fA-F]{1,4}:)(:[0-9a-fA-F]{1,4}){1,6}$";
		if (host.matches(ipv6Pattern)) {
			return true;
		}

		// Hostname validation (RFC 1123): each label is 1-63 chars,
		// total length <= 253, labels contain only letters, digits, and hyphens,
		// and cannot start or end with a hyphen.
		if (host.length() > 253) {
			return false;
		}
		String hostnamePattern = "^([a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?\\.)*"
				+ "[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?$";
		return host.matches(hostnamePattern);
	}

	/**
	 * Validates that the given value is a valid TCP/UDP port number.
	 * The value must be a plain integer string in the range 1–65535.
	 * Non-numeric characters, leading/trailing spaces, and values outside
	 * the valid range are all rejected, preventing injection of extra
	 * arguments into commands that concatenate the port into a string.
	 *
	 * @param port the port value to validate
	 * @return true if the value is a valid port number, false otherwise
	 */
	private static boolean isValidPort(String port) {
		if (port == null || port.trim().isEmpty()) {
			return false;
		}
		try {
			int p = Integer.parseInt(port.trim());
			return p >= 1 && p <= 65535;
		} catch (NumberFormatException e) {
			return false;
		}
	}

	/**
	 * Validates an HTTP header string intended for use with curl's -H option.
	 * Rejects values that could exploit curl-specific injection vectors:
	 * <ul>
	 *   <li>Values starting with {@code @} — curl reads headers from a file when
	 *       the value begins with {@code @} (e.g. {@code -H @/etc/passwd}).</li>
	 *   <li>Values containing CR ({@code \r}) or LF ({@code \n}) — prevents
	 *       HTTP header injection (CRLF injection).</li>
	 *   <li>Values that do not follow the {@code Name: Value} format required by
	 *       RFC 7230 (header name must be a valid token).</li>
	 * </ul>
	 * Note: shell injection is already prevented by {@link ProcessBuilder} receiving
	 * a {@code List<String>} — no shell is invoked, so metacharacters are literals.
	 *
	 * @param header the raw header string (e.g. {@code "Content-Type: application/json"})
	 * @return true if the header is safe to pass to curl, false otherwise
	 */
	private static boolean isValidHeader(String header) {
		if (header == null || header.isEmpty()) {
			return false;
		}
		// Prevent curl's @filename feature: curl reads headers from a file
		// when a value passed to -H starts with '@'.
		if (header.startsWith("@")) {
			return false;
		}
		// Prevent CRLF injection into the outgoing HTTP request.
		if (header.contains("\r") || header.contains("\n")) {
			return false;
		}
		// Enforce "Name: Value" or "Name:Value" format.
		// Header names must be RFC 7230 tokens: alphanumeric + select special chars.
		int colonIndex = header.indexOf(':');
		if (colonIndex <= 0) {
			return false;
		}
		String name = header.substring(0, colonIndex);
		return name.matches("[a-zA-Z0-9!#$%&'*+\\-.^_`|~]+");
	}

	// Define supported protocols in lowercase
    private static final Set<String> ALLOWED_SCHEMES = Set.of(
        "http", 
        "https", 
        "socks", 
        "socks4", 
        "socks4a", 
        "socks5", 
        "socks5h"
    );

    public static boolean isValidUrl(String urlString) {
        if (urlString == null || urlString.isBlank()) {
            return false;
        }

        try {
            URI uri = new URI(urlString.trim());

            // 1. Ensure a scheme exists and is allowed
            String scheme = uri.getScheme();
            if (scheme == null || !ALLOWED_SCHEMES.contains(scheme.toLowerCase(Locale.ROOT))) {
                return false;
            }

            // 2. Reject non-hierarchical/opaque URIs (e.g., "mailto:a@b.com" or "socks5:invalid")
            if (uri.isOpaque()) {
                return false;
            }

            // 3. Ensure a valid host/authority exists
            // For proxies and web URLs, host is required (e.g., "socks5://127.0.0.1:1080")
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                // Fallback: Check if authority exists when host parsing fails (e.g., user:pass@host:port)
                if (uri.getAuthority() == null || uri.getAuthority().isBlank()) {
                    return false;
                }
            }

            // 4. Validate port range if specified
            int port = uri.getPort();
            if (port != -1 && (port < 1 || port > 65535)) {
                return false;
            }

            return true;
        } catch (URISyntaxException e) {
            return false;
        }
    }
}