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
import java.util.Map;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.BufferedWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

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

	public static String curl(String url, String[] headers, String body, Map<String, Object> options, Map<String, Object> proxy) throws IOException {
		List<String> command = buildCurlCommand(url, headers, options, proxy);
		Path tempFile = null;
		try {
			if(body != null) {
				tempFile = Files.createTempFile("body", ".txt");
				Files.write(tempFile, body.getBytes(StandardCharsets.UTF_8));
				command.add("-d");
				command.add("@" + tempFile.toAbsolutePath());
			}
			return execute(new ProcessBuilder(command));
		}finally {
            if (tempFile != null && Files.exists(tempFile.toAbsolutePath())) {
                Files.delete(tempFile.toAbsolutePath());
            }
		}		
	}

	private static List<String> buildCurlCommand(String url, String[] headers, Map<String, Object> options, Map<String, Object> proxy) {
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
			command.add(connectTimeout.trim());
		}
		if(maxTime != null && !maxTime.trim().isEmpty()) {
			command.add("--max-time");
			command.add(maxTime.trim());
		}
		if(booleanOption(proxy, "insecure")) command.add("--proxy-insecure");
		if(forwardProxy != null && !forwardProxy.trim().isEmpty()) {
			command.add("-x");
			command.add(forwardProxy.trim());
		}
		command.add("-i");
		command.add("-L");
		command.add(url);
		for (String header : headers ) {
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
