package com.hanyuflow.android;
import org.junit.Test;
import org.json.*;
import static org.junit.Assert.*;
public class ProgramRulesTest {
 @Test public void timeOrderAlternatesAreAcceptedButWrongOrderIsNot()throws Exception{JSONArray expected=new JSONArray().put("我").put("明天").put("去").put("学校"),alternatives=new JSONArray().put("明天我去学校");assertTrue(LearningRules.grade("ordering",new JSONArray().put("明天").put("我").put("去").put("学校"),expected,alternatives));assertFalse(LearningRules.grade("ordering",new JSONArray().put("学校").put("明天").put("我").put("去"),expected,alternatives));}
 @Test public void toneMarksAndUmlautStayMeaningful()throws Exception{assertTrue(LearningRules.grade("recall","ni3","nǐ",new JSONArray().put("ni3")));assertFalse(LearningRules.grade("recall","ní","nǐ",new JSONArray().put("ni3")));assertFalse(LearningRules.grade("recall","nǔ","nǚ",new JSONArray().put("nu:3").put("nv3")));}
 @Test public void commonGrammarErrorsAreNotAccepted()throws Exception{assertFalse(LearningRules.grade("recall","我不有钱","我没有钱",new JSONArray()));assertFalse(LearningRules.grade("recall","银行在哪里吗","银行在哪里",new JSONArray().put("银行在哪儿")));}
 @Test public void retentionUsesFollowupStartNotADelayedFinish(){long first=java.time.Instant.parse("2026-10-13T08:00:00Z").toEpochMilli();assertFalse(ProgramStore.retentionEvidenceReady(first,first-600000,first+86400000L,"UTC"));assertFalse(ProgramStore.retentionEvidenceReady(first,first+3600000L,first+90000000L,"UTC"));assertTrue(ProgramStore.retentionEvidenceReady(first,first+86400000L,first+86460000L,"UTC"));assertFalse(ProgramStore.retentionEvidenceReady(first,first+86400000L,first+86399999L,"UTC"));}
 @Test public void retentionNeedsElapsedTimeAndLaterProfileDay(){long start=java.time.Instant.parse("2026-10-13T23:55:00Z").toEpochMilli();assertFalse(ProgramStore.retentionReady(start,start+600000,"UTC"));assertTrue(ProgramStore.retentionReady(start,start+86400000,"UTC"));assertFalse(ProgramStore.retentionReady(start,start,"Asia/Jakarta"));}
}
