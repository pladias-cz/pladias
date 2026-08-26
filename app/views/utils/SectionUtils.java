package views.utils;

import models.traits.Section;

import java.util.List;

public class SectionUtils
{
	public static  List<Section> getSortedTopLevelSections()
	{
		return Section.find().query()
		        .where()
		        .eq("depth", 1)
		        .orderBy("lft asc")
		        .findList();
	}
}
