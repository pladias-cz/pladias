package global;


//import play.Application;
//import play.GlobalSettings;
//import play.Logger;
//import play.data.format.Formatters;
//import play.libs.F;
//import play.libs.F.Promise;
//import play.mvc.Http;
//import play.mvc.SimpleResult;
//import repositories.SquareRepository;

public class Global /*extends GlobalSettings*/ {

	/*
	public static SquareRepository squareRepository;


	@Override
	  public void onStart(Application app) {

	    Logger.info("Application has started");
	    try
	    {
	    	squareRepository = new SquareRepository();
	    	Logger.info("Square repository created");
		    Formatters.register(LocalDate.class, new DateFormatter());
	    }
	    catch (Exception e)
	    {
	    	Logger.error(e.getMessage());
	    }
	  }

      public F.Promise<SimpleResult> onError(Http.RequestHeader request, java.lang.Throwable t)
      {
    	  Logger.error("Exception:", t);

    	  String stacktrace = getStackTrace(t);

    	  return Promise.<SimpleResult>pure(play.mvc.Results.internalServerError(
    	            views.html.errorpage.render(t, stacktrace)
    	        ));
      }

      private String getStackTrace(Throwable t)
      {
    	  Writer writer = new StringWriter();
    	  PrintWriter printWriter = new PrintWriter(writer);
    	  t.printStackTrace(printWriter);
    	  return writer.toString();
      }


	  @Override
	  public void onStop(Application app) {
	    Logger.info("Application shutdown...");
	  }
	  */
}
