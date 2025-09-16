package com.mulesoft.tool.network;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.io.SequenceInputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.BufferedWriter;

public class NetworkUtils {

	public static String ping(String host) throws Exception {
		return execute(new ProcessBuilder("ping", "-c", "4", host));
	}

	public static String resolveIPs(String host, String dnsServer) throws UnknownHostException {
		if (dnsServer.equals("default") || dnsServer == null || dnsServer.isEmpty())
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
 			dnsServer = "@" + dnsServer;
			try {
				return execute(new ProcessBuilder("dig", "+short", dnsServer, host));
			} catch (IOException e) {
				return e.getMessage();
			} 
		}
	}

	public static String curl(String url, String[] headers, Boolean insecure) throws IOException {
	    return curl(url, "GET", headers, null, insecure, 0, true, null, null);
	}
	
	/**
	 * Executes a cURL command with comprehensive support for HTTP/HTTPS requests
	 * 
	 * @param url The URL to send the request to
	 * @param method The HTTP method (GET, POST, PUT, DELETE, etc.)
	 * @param headers Array of headers in format "Name: Value"
	 * @param payload Request body (JSON, XML, etc.) - ignored for GET requests
	 * @param insecure Whether to skip SSL certificate validation
	 * @param timeout Connection timeout in seconds (0 for no timeout)
	 * @param followRedirects Whether to follow HTTP redirects
	 * @param basicAuth Basic authentication in format "username:password"
	 * @param proxy Proxy server in format "host:port"
	 * @return The command execution result as a string
	 * @throws IOException If an I/O error occurs
	 */
	public static String curl(
	        String url, 
	        String method, 
	        String[] headers, 
	        String payload,
	        Boolean insecure,
	        int timeout,
	        Boolean followRedirects,
	        String basicAuth,
	        String proxy) throws IOException {
	    
	    List<String> command = new ArrayList<String>();
	    command.add("curl");
	    
	    // Basic options
	    if (insecure) command.add("-k");
	    command.add("-i");  // Include protocol headers in output
	    
	    // Follow redirects
	    if (followRedirects != null && followRedirects) {
	        command.add("-L");
	    }
	    
	    // HTTP method
	    if (method != null && !method.equalsIgnoreCase("GET")) {
	        command.add("-X");
	        command.add(method.toUpperCase());
	    }
	    
	    // Connection timeout
	    if (timeout > 0) {
	        command.add("--connect-timeout");
	        command.add(String.valueOf(timeout));
	    }
	    
	    // Basic authentication
	    if (basicAuth != null && !basicAuth.isEmpty()) {
	        command.add("-u");
	        command.add(basicAuth);
	    }
	    
	    // Proxy
	    if (proxy != null && !proxy.isEmpty()) {
	        command.add("--proxy");
	        command.add(proxy);
	    }
	    
	    // Headers
	    if (headers != null) {
	        for (String header : headers) {
	            command.add("-H");
	            command.add(header);
	        }
	    }
	    
	    // Add payload for non-GET requests
	    if (payload != null && !payload.isEmpty() && !method.equalsIgnoreCase("GET")) {
	        command.add("-d");
	        command.add(payload);
	    }
	    
	    // URL (last parameter)
	    command.add(url);
	    
	    return execute(new ProcessBuilder(command));
	}

	public static String testConnect(String host, String port) {
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
		return execute(new ProcessBuilder("traceroute", "-w", "3", "-q", "1", "-m", "18", "-n", host));
	}

	public static String certest(String host, String port) throws Exception {
		return execute(new ProcessBuilder("openssl", "s_client", "-showcerts", "-servername", host, "-connect", host+":"+port));
	}

	public static String cipherTest(String host, String port) throws Exception {
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
}
