package controllers.common;

import controllers.ControllerBase;
import models.TemporaryFile;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Result;

public class TemporaryFilesProviderController extends ControllerBase
{

	public  Result download(Http.Request request, Integer id)
	{
		Messages messages = getMessages(request);
		TemporaryFile tempFile = TemporaryFile.find().byId(id);
		if (tempFile != null)
		{
			byte[] data = tempFile.getData();
				tempFile.delete();
			return ok(data)
				.withHeader("Content-disposition", String.format("attachment; filename=%s", tempFile.getFilename()))
				.as("application/x-download");
		}
		return ok(messages.at("TemporaryFilesProvider.fileDoesNotExist"));
	}
}
