package controllers;

import com.typesafe.config.Config;
import models.UserActivity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import service.user.ActivityDetails;
import service.user.UserActivityService;

import javax.inject.Inject;
import java.util.Map;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;

//@Security.Authenticated(Secured.class)
public class GeoServer extends ControllerBase
{
	private static String baseUrl = null;

	private static final String Protocol = "http";
	private static final int Timeout = 15000;

	final Logger logger = LoggerFactory.getLogger(GeoServer.class);

	private final WSClient ws;
	private final Config config;

	@Inject
	public GeoServer(Config config, WSClient ws)
	{
		this.config = config;
		this.ws = ws;
	}

	private  String getBaseUrl()
	{
		if (baseUrl == null)
		{
			String host = config.getString("geoserver.host");
			String port = config.getString("geoserver.port");

			baseUrl =  Protocol + "://" + host + ":" + port + "/geoserver/";
		}
		return baseUrl;
	}

	public  Result processRequest(Http.Request request, String service)
	{

		try
		{
			String completeUrl = getBaseUrl() + service;
			WSRequest wsRequest = ws.url(completeUrl);
			setParameters(wsRequest, request.queryString());
			CompletionStage<WSResponse> responsePromise = wsRequest.get();
			WSResponse response = responsePromise.toCompletableFuture().get(Timeout, TimeUnit.MILLISECONDS);

			byte[] bytes = response.asByteArray();
			return ok(bytes).as("image/png");
		}
		catch (Exception e)
		{
			logger.error(e.getMessage());
			return badRequest();
		}
	}

	public  Result processRequest2(Http.Request request, String service)
	{
		try
		{
			ActivityDetails details = new ActivityDetails();
			details.newValue = serializeParams(request.queryString());
			UserActivityService.recordActivity(request.session(), UserActivity.GeoserverWfsQuery, details);
			String completeUrl = getBaseUrl() + service;
			WSRequest wsRequest = ws.url(completeUrl);
			setParameters(wsRequest, request.queryString());
			CompletionStage<WSResponse> responsePromise = wsRequest.get();
			WSResponse wsResponse = responsePromise.toCompletableFuture().get(Timeout, TimeUnit.MILLISECONDS);
			return ok(wsResponse.asByteArray()).as("application/json");

		}
		catch (Exception e)
		{
			logger.error(e.getMessage());
			return badRequest();
		}
	}

	private  String serializeParams(Map<String, String[]> params) {
		StringBuilder builder = new StringBuilder();
		String[] keys = new String[] { "typeName", "viewparams" };
		for (String key : keys)
		{
			String[] values = params.get(key);
			if (values == null)
				continue;

			for (String value : values)
			{
				if (builder.length() > 0)
				{
					builder.append('&');
				}
				builder.append(key).append('=').append(value);
			}
		}
		return builder.toString();
	}

	private  void setParameters(WSRequest wsRequest, Map<String, String[]> map)
	{
		for(String key : map.keySet())
		{
			for (String value: map.get(key))
			{
				wsRequest.setQueryParameter(key, value);
			}
		}
	}
}
