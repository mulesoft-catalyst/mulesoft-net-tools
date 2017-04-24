package com.mulesoft.tool.vpc;


import java.io.IOException;
import java.io.InputStream;
import java.io.SequenceInputStream;
import java.util.Map;
import org.mule.api.MuleEventContext;
import org.mule.api.lifecycle.Callable;
import org.mule.api.transport.PropertyScope;





public class Curl implements Callable {

	@Override
	public Object onCall(MuleEventContext eventContext) throws Exception {
		@SuppressWarnings("unchecked")
		Map<String, String> inbound = (Map<String, String>) eventContext.getMessage().getProperty("http.query.params",
				PropertyScope.INBOUND);
		return call(inbound.get("host"), inbound.get("path"), inbound.get("port"));
	}

	public InputStream call(String host, String path, String port) throws IOException {
		
			String url = "";
			url = url.concat(host.concat("/").concat(path).concat(":").concat(port));			
			ProcessBuilder pb = new ProcessBuilder("curl", "-i", "-L", "-k","--cert-status", url);
			Process p = pb.start();
			SequenceInputStream s = new SequenceInputStream(p.getInputStream(), p.getErrorStream());		
			return s;
	}
}
