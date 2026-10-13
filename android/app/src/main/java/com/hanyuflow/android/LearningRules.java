package com.hanyuflow.android;

import java.text.Normalizer;
import java.util.Locale;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.Instant;
import org.json.JSONArray;
import org.json.JSONObject;

public final class LearningRules {
    public static String normalize(String value) { return Normalizer.normalize(value, Normalizer.Form.NFKC).trim().toLowerCase(Locale.ROOT).replaceAll("[\\s。，！？,.!?、]", ""); }
    public static boolean grade(String type, Object answer, Object expected, JSONArray alternatives) {
        if (type.equals("ordering") || type.equals("matching")) {
            if (!(answer instanceof JSONArray) || !(expected instanceof JSONArray)) return false;
            JSONArray a=(JSONArray)answer, e=(JSONArray)expected;
            if (a.length()!=e.length()) return false;
            StringBuilder left=new StringBuilder(),right=new StringBuilder();
            for(int i=0;i<a.length();i++){ if(!(a.opt(i) instanceof String))return false; if(type.equals("matching")&&!a.optString(i).equals(e.optString(i)))return false; left.append(a.optString(i));right.append(e.optString(i)); }
            if(type.equals("matching") || normalize(left.toString()).equals(normalize(right.toString())))return true;
            for(int i=0;i<alternatives.length();i++)if(normalize(left.toString()).equals(normalize(alternatives.optString(i))))return true;
            return false;
        }
        if(!(answer instanceof String)||!(expected instanceof String))return false;
        if(normalize((String)answer).equals(normalize((String)expected)))return true;
        for(int i=0;i<alternatives.length();i++)if(normalize((String)answer).equals(normalize(alternatives.optString(i))))return true;
        return false;
    }
    public static JSONObject schedule(double ease,double interval,int reps,int lapses,String rating,long now) throws Exception {
        if(!java.util.Arrays.asList("AGAIN","HARD","GOOD","EASY").contains(rating))throw new IllegalArgumentException("Invalid review rating");
        ease=Math.max(1.3,Math.min(3.5,ease+(rating.equals("AGAIN")?-.2:rating.equals("HARD")?-.15:rating.equals("EASY")?.15:0)));
        double days=rating.equals("AGAIN")?10.0/1440:rating.equals("HARD")?Math.max(1,interval*1.2):rating.equals("EASY")?Math.max(4,interval*ease*1.3):reps==0?1:reps==1?3:Math.max(1,interval*ease);
        days=Math.min(365,days);
        return new JSONObject().put("ease",ease).put("interval",days).put("repetitions",rating.equals("AGAIN")?0:reps+1).put("lapses",lapses+(rating.equals("AGAIN")?1:0)).put("due",now+Math.round(days*86400000));
    }
    public static String day(long timestamp,String timezone) { return Instant.ofEpochMilli(timestamp).atZone(ZoneId.of(timezone)).toLocalDate().toString(); }
    public static int nextStreak(String lastDay,int current,String today) { if(today.equals(lastDay))return current;return lastDay!=null&&LocalDate.parse(lastDay).plusDays(1).toString().equals(today)?current+1:1; }
    public static boolean validBackend(String value) { try { java.net.URI uri=new java.net.URI(value);String host=uri.getHost();return uri.getScheme().equals("https")&&host!=null&&uri.getUserInfo()==null&&uri.getQuery()==null&&uri.getFragment()==null&&!host.equalsIgnoreCase("localhost")&&!host.equals("127.0.0.1")&&!host.equals("0.0.0.0")&&!host.equals("::1")&&!host.equals("[::1]")&&(uri.getPath()==null||uri.getPath().isEmpty()||uri.getPath().equals("/"));}catch(Exception e){return false;} }
}
