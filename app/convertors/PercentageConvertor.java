package convertors;

import play.i18n.Messages;

public class PercentageConvertor 
{
	private boolean useIntegerRepresentation;
	private Messages messages;
	public PercentageConvertor(Messages messages, boolean useIntegerRepresentation)
	{
		this.useIntegerRepresentation = useIntegerRepresentation;
		this.messages = messages;
	}
	public String convertToString(int value)
	{
		if (useIntegerRepresentation)
			return Integer.toString(value);
		
		float fValue = value;
		return Float.toString(fValue/100);
	}
	
	public int convertToInteger(String value) throws Exception
	{
		try
		{
			return doConvertToInteger(value);
			
		}
		catch (NumberFormatException e)
		{
			throw new Exception(messages.at("PercentageConverter.InvalidValue"));
		}
		
	}
	
	public double convertToDouble(String value) throws Exception
	{
		try
		{
			return doConvertToDouble(value);
			
		}
		catch (NumberFormatException e)
		{
			throw new Exception(messages.at("PercentageConverter.InvalidValue"));
		}
		
	}
	
	private int doConvertToInteger(String value)  throws Exception
	{
		if (useIntegerRepresentation)
		{
			int intVal = Integer.parseInt(value);
			if (0 <= intVal  &&  intVal <= 100)
			{
				return intVal;
			}
			else
			{
				throw new Exception(messages.at("PercentageConverter.OutOfRange0_100"));
			}
		}
		else 
		{
			float floatVal = Float.parseFloat(value);
			if (0 <= floatVal && floatVal <= 1)
			{
				return (int)(floatVal*100);
			}
			else 
			{
				throw new Exception(messages.at("PercentageConverter.OutOfRange0_1"));
			}
		}
	}
	
	private double doConvertToDouble(String value)  throws Exception
	{
		double doubleVal = Double.parseDouble(value);
		if (useIntegerRepresentation)
		{
			if (0 <= doubleVal  &&  doubleVal <= 100)
			{
				return doubleVal;
			}
			else
			{
				throw new Exception(messages.at("PercentageConverter.OutOfRange0_100"));
			}
		}
		else 
		{
			
			if (0 <= doubleVal && doubleVal <= 1)
			{
				return (int)(doubleVal*100);
			}
			else 
			{
				throw new Exception(messages.at("PercentageConverter.OutOfRange0_1"));
			}
		}
	}
}
