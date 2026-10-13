package com.hanyuflow.android;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.JSONArray;
import org.json.JSONObject;
public class LearningRulesTest {
 @Test public void toneMarksAndPunctuation(){assertTrue(LearningRules.grade("blank"," 我 喝 水！","我喝水",new JSONArray()));assertFalse(LearningRules.grade("pinyin","wo","wǒ",new JSONArray()));}
 @Test public void alternates(){assertTrue(LearningRules.grade("blank","您好","你好",new JSONArray().put("您好")));assertFalse(LearningRules.grade("blank",12,"你好",new JSONArray()));}
 @Test public void ordering(){assertTrue(LearningRules.grade("ordering",new JSONArray().put("我").put("喝").put("水"),new JSONArray().put("我").put("喝").put("水"),new JSONArray()));assertFalse(LearningRules.grade("ordering",new JSONArray().put("水").put("喝").put("我"),new JSONArray().put("我").put("喝").put("水"),new JSONArray()));}
 @Test public void matching(){assertFalse(LearningRules.grade("matching",new JSONArray().put("b").put("a"),new JSONArray().put("a").put("b"),new JSONArray()));}
 @Test public void scheduler()throws Exception{JSONObject again=LearningRules.schedule(2.5,0,0,0,"AGAIN",1000000);assertEquals(1600000,again.getLong("due"));assertEquals(1,again.getInt("lapses"));assertEquals(1,LearningRules.schedule(2.5,0,0,0,"GOOD",0).getDouble("interval"),.001);assertEquals(3,LearningRules.schedule(2.5,1,1,0,"GOOD",0).getDouble("interval"),.001);assertEquals(4,LearningRules.schedule(2.5,0,0,0,"EASY",0).getDouble("interval"),.001);}
 @Test public void intervalCap()throws Exception{assertEquals(365,LearningRules.schedule(3.5,360,10,0,"EASY",0).getDouble("interval"),.001);}
 @Test public void timezoneStreak(){assertEquals("2026-01-02",LearningRules.day(java.time.Instant.parse("2026-01-01T20:00:00Z").toEpochMilli(),"Asia/Jakarta"));assertEquals(3,LearningRules.nextStreak("2026-01-01",2,"2026-01-02"));assertEquals(2,LearningRules.nextStreak("2026-01-01",2,"2026-01-01"));assertEquals(1,LearningRules.nextStreak("2026-01-01",2,"2026-01-04"));}
 @Test public void backendMustBeReachableHttpsOrigin(){assertFalse(LearningRules.validBackend("http://localhost:3000"));assertFalse(LearningRules.validBackend("https://127.0.0.1:3000"));assertFalse(LearningRules.validBackend("https://user:secret@example.org"));assertFalse(LearningRules.validBackend("https://example.org/api"));assertTrue(LearningRules.validBackend("https://learning.example.org"));}
}
