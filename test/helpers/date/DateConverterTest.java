package helpers.date;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.mockito.Mockito.mock;

import java.security.InvalidParameterException;
import java.util.Calendar;

import org.junit.Test;
import play.i18n.Messages;


public class DateConverterTest {

	private Messages messages()
	{
		return mock(Messages.class);
	}

	@Test (expected = InvalidParameterException.class) 
	public void nullInput()
	{
		DateConverter.toDate(null, messages());
	}
	
	@Test
	public void sineDatumInput()
	{
		DateDescriptor result = DateConverter.toDate("s.  d. ", messages());
		assertNull(result.getDate());
		assertEquals(DatePrecision.INVALID, result.getPrecision());
	}
	
	@Test (expected = InvalidParameterException.class)
	public void invalidInput()
	{
		DateConverter.toDate("xyz", messages());
	}
	
	@Test (expected = InvalidParameterException.class) 
	public void invalidDateLengthMonthYear()
	{
		DateConverter.toDate("52013", messages());
	}
	
	@Test (expected = InvalidParameterException.class) 
	public void invalidDateLengthDayMonthYear()
	{
		DateConverter.toDate("1052013", messages());
	}
	
	@Test (expected = InvalidParameterException.class) 
	public void invalidDayValue()
	{
		DateConverter.toDate("3252013", messages());
	}
	
	@Test (expected = InvalidParameterException.class) 
	public void invalidMonthValue()
	{
		DateConverter.toDate("25132013", messages());
	}
	
	@Test 
	public void correctDateDayMonthYear()
	{
		DateDescriptor dateInterval = DateConverter.toDate("02032004", messages());
		Calendar cal = Calendar.getInstance();
		cal.setTime(dateInterval.getDate());
		assertEquals(2, cal.get(Calendar.DATE));
		assertEquals(2, cal.get(Calendar.MONTH)); //0-based
		assertEquals(2004, cal.get(Calendar.YEAR)); 
		assertEquals(DatePrecision.DAY, dateInterval.getPrecision());
	}

	@Test
	public void correctDateDayDotMonthDotYear()
	{
		DateDescriptor dateInterval = DateConverter.toDate("2.3.2004", messages());
		Calendar cal = Calendar.getInstance();
		cal.setTime(dateInterval.getDate());
		assertEquals(2, cal.get(Calendar.DATE));
		assertEquals(2, cal.get(Calendar.MONTH)); //0-based
		assertEquals(2004, cal.get(Calendar.YEAR));
		assertEquals(DatePrecision.DAY, dateInterval.getPrecision());
	}
	
	@Test 
	public void correctDateMonthYear()
	{
		DateDescriptor dateInterval = DateConverter.toDate("032004", messages());
		Calendar cal = Calendar.getInstance();
		cal.setTime(dateInterval.getDate());
		assertEquals(1, cal.get(Calendar.DATE));
		assertEquals(2, cal.get(Calendar.MONTH)); //0-based
		assertEquals(2004, cal.get(Calendar.YEAR)); 
		assertEquals(DatePrecision.MONTH, dateInterval.getPrecision());
	}
	
	@Test 
	public void correctDateYear()
	{
		DateDescriptor dateInterval = DateConverter.toDate("2004", messages());
		Calendar cal = Calendar.getInstance();
		cal.setTime(dateInterval.getDate());
		assertEquals(1, cal.get(Calendar.DATE));
		assertEquals(0, cal.get(Calendar.MONTH)); //0-based
		assertEquals(2004, cal.get(Calendar.YEAR)); 
		assertEquals(DatePrecision.YEAR, dateInterval.getPrecision());
	}
	
	@Test
	public void correctYearMonthDay()
	{
		DateDescriptor dateInterval = DateConverter.toDate("2007-04-06", messages());
		Calendar cal = Calendar.getInstance();
		cal.setTime(dateInterval.getDate());
		assertEquals(6, cal.get(Calendar.DATE));
		assertEquals(3, cal.get(Calendar.MONTH));
		assertEquals(2007, cal.get(Calendar.YEAR));
		assertEquals(DatePrecision.DAY, dateInterval.getPrecision());
	}
	
	@Test
	public void correctYearMon()
	{
		DateDescriptor dateInterval = DateConverter.toDate("2007-04", messages());
		Calendar cal = Calendar.getInstance();
		cal.setTime(dateInterval.getDate());
		assertEquals(1, cal.get(Calendar.DATE));
		assertEquals(3, cal.get(Calendar.MONTH));
		assertEquals(2007, cal.get(Calendar.YEAR));
		assertEquals(DatePrecision.MONTH, dateInterval.getPrecision());
	}
	
	@Test(expected=InvalidParameterException.class)
	public void incorrectMonthInYearMonthDay()
	{
		DateConverter.toDate("2007-14-06", messages());
	}
	
	@Test(expected=InvalidParameterException.class)
	public void incorrectDayInYearMonthDay()
	{
		DateConverter.toDate("2007-11-32", messages());
	}
	
	@Test(expected=InvalidParameterException.class)
	public void incorrectYearInYearMonthDay()
	{
		int currentYear = Calendar.getInstance().get(Calendar.YEAR);
		DateConverter.toDate((currentYear+1)+"-11-30", messages());
	}
	
	@Test(expected=InvalidParameterException.class)
	public void incorrectYearInYearMonth()
	{
		int currentYear = Calendar.getInstance().get(Calendar.YEAR);
		DateConverter.toDate((currentYear+1)+"-11", messages());
	}
	
	@Test
	public void correctYearMonthNoDay()
	{
		DateDescriptor dateInterval = DateConverter.toDate("2007-00-00", messages());
		Calendar cal = Calendar.getInstance();
		cal.setTime(dateInterval.getDate());
		assertEquals(1, cal.get(Calendar.DATE));
		assertEquals(0, cal.get(Calendar.MONTH));
		assertEquals(2007, cal.get(Calendar.YEAR));
		assertEquals(DatePrecision.YEAR, dateInterval.getPrecision());
	}
	
	@Test
	public void correctYearNoMonth()
	{
		DateDescriptor dateInterval = DateConverter.toDate("2007-00", messages());
		Calendar cal = Calendar.getInstance();
		cal.setTime(dateInterval.getDate());
		assertEquals(1, cal.get(Calendar.DATE));
		assertEquals(0, cal.get(Calendar.MONTH));
		assertEquals(2007, cal.get(Calendar.YEAR));
		assertEquals(DatePrecision.YEAR, dateInterval.getPrecision());
	}
}
