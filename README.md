# Net Tools API

The Net Tools API is a deployable Mule app that you can deploy to CloudHub or any worker cloud. The app will then expose a very simple UI that will allow you to do basic networking commands. The idea is that most networking related issues with your CloudHub VPC and VPN are related to connectivity to your on-prem systems, and most of those issues end up being resolved on the customer end. If you have this tool available to you, you can work with your Networking team to test connectivity to various on-prem systems and verify that firewall and routing rules are working. It can also be used to generate some traffic that can help with diagnosing networking issues.

## v3 Highlights

This version refreshes the web UI with tab-based tool selection, clearer input forms, console-style output, and expanded curl controls for GET/POST requests, query parameters, headers, forward proxy, insecure TLS, and request bodies. Query parameters and headers can be entered row by row or in bulk text mode. It also removes the previous jQuery and Toastr dependencies in favor of plain JavaScript and CSS.

This version also consolidates the application into a single counted Mule flow, reducing the number of license-counted flows from more than 10 to 1 to align with the updated pricing model.

This app uses a single configurable HTTP listener port. HTTPS termination is expected to be handled by the platform ingress or load balancer, which avoids application-managed certificates and keeps the deployment model compatible with CloudHub 2.0 and RTF single-port ingress behavior.

## Features

- DNS lookups with an optional DNS server
- Ping
- TraceRoute
- Opening a TCP socket
- curl GET and POST requests with optional query parameters, headers, and forward proxy, including bulk entry
- Optional insecure TLS for curl target requests and HTTPS proxy connections
- Pull SSL certificates
- Check supported ciphers for a given SSL/TLS endpoint

The curl forward proxy field accepts curl-compatible proxy URLs such as `http://proxy.example.com:8080`, `socks4://proxy.example.com:1080`, `socks5://proxy.example.com:1080`, and `socks5h://proxy.example.com:1080`. Use `socks5://` for local DNS resolution and `socks5h://` for DNS resolution through the proxy.

Use `Allow insecure TLS` to skip certificate validation for the target URL. Use `Allow insecure proxy TLS` to skip certificate validation when curl connects to an HTTPS forward proxy.

## Latest build

Latest build can be found here: https://github.com/mulesoft-labs/net-tools-api/releases

# Usage

The UI can be accessed by using the base URL for the app.  The options are listed below.

- CloudHub Shared Load Balancer: `http://{app-name}.{region}.cloudhub.io` where the app-name and region are specific to the deployed app.
- Dedicated Load Balancer: `custom url`.  See *Configuration* section to update settings.

The UI is protected by Basic Authentication, and the default credentials are listed in the *Configuration* section.

The API is also protected by Basic Authentication and is available at `POST /api/tools`.  The RAML definition is available in `src/main/resources/api/net-tools.raml`.

Example request:

```json
{
  "operation": "ping",
  "host": "localhost"
}
```

# Configuration
The properties below can be set on the app to override the default settings.  The listener port must be set to accommodate load balancer and VPC firewall rule settings.  The default settings are for the CloudHub shared load balancer HTTP endpoint.

- `user`: User name for login.  Defaults to `vpc-tools`
- `pass`: Password for login.  Defaults to `SomePass`.  This is defined as a secure property.
- `http.private.port`: Sets the listener port for HTTP. Defaults to `8081` for local execution and is provided by CloudHub when deployed.
- `httpListener`: The running state of the HTTP endpoint flows.  Defaults to `started`.  Options: `started` or `stopped`.  Stop this to disable HTTP endpoint on CloudHub 1.0 or non-RTF infrastructure.  This doesn't affect RTF or CloudHub 2.0 because only a single HTTP port is used.
- `ignoreFiles`: Comma-delimited list of browser-requested UI resource files for this app to ignore, such as `favicon.ico`.  Defaults to `favicon.ico`.

## Network Considerations

- The app uses a single HTTP listener configured by `http.private.port`.
- When using CloudHub 2.0 or RTF, enable *Last-Mile Security* in the app's Ingress tab if HTTPS is required at the Mule application.
- Ping uses ICMP and may not work on CloudHub 2.0 or in environments where ICMP is disabled.

# References
- [CloudHub 2.0 Infrastructure Considerations](https://docs.mulesoft.com/cloudhub-2/ch2-comparison#infrastructure-considerations)
- [CloudHub 1.0 Load Balancer Architecture](https://docs.mulesoft.com/cloudhub-1/lb-architecture)
- [Enable Last Mile Security in RTF](https://help.mulesoft.com/s/article/How-to-Enable-both-Last-Mile-Security-and-Mutual-TLS-in-Runtime-Fabric)
- [Original repository](https://github.com/mulesoft-labs/net-tools-api)

# Contributors

- Jorge Luis García Pérez - Mule 3 version creator and maintainer 
- Facundo Lopez Kaufmann - Mule 4 upgrade
- Takahiro Yamamoto - Version 3 upgrade
