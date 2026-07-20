package helpers.compare;

import java.text.Collator;
import java.util.Comparator;
import java.util.Locale;

public class CzechComparator implements Comparator<String> {
    /*private static String rules =
            "< ' ' < A,a;Á,á;À,à;Â,â;Ä,ä;Ą,ą < B,b < C,c;Ç,ç < Č,č < D,d;Ď,ď < E,e;É,é;È,è;Ê,ê;Ě,ě" +
            "< F,f < G,g < H,h < CH,Ch,cH,ch < I,i;Í,í < J,j < K,k < L,l;Ľ,ľ;Ł,ł < M,m < N,n;Ň,ň" +
            "< O,o;Ó,ó;Ô,ô;Ö,ö < P,p < Q,q < R,r;Ŕ,ŕ < Ř,ř < S,s < Š,š < T,t;Ť,ť" +
            "< U,u;Ú,ú;Ů,ů;Ü,ü < V,v < W,w < X,x < Y,y;Ý,ý < Z,z;Ż,ż < Ž,ž" +
            "< 0 < 1 < 2 < 3 < 4 < 5 < 6 < 7 < 8 < 9" +
            "< '.' < ',' < ';' < '?' < '¿' < '!' < '¡' < ':' < '\"' < '\'' < '«' < '»'" +
            "< '-' < '|' < '/' < '\\' < '(' < ')' < '[' < ']' < '<' < '>' < '{' < '}'" +
            "< '&' < '¢' < '£' < '¤' < '¥' < '§' < '©' < '®' < '%' < '‰' < '$'" +
            "< '=' < '+' < '×' < '*' < '÷' < '~'";

    private RuleBasedCollator comparator;

    public CzechComparator() throws ParseException
    {
    	comparator = new RuleBasedCollator(rules);
    }

    public int compare(String s1, String s2) {
        return comparator.compare(s1, s2);
    }*/
    Collator c = Collator.getInstance(new Locale("cs", "CZ"));

    public int compare(String s1, String s2) {
        return c.compare(s1, s2);
    }
}
