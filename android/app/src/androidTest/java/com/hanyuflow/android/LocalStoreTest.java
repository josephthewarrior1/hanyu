package com.hanyuflow.android;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.*;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import org.json.*;
import java.util.UUID;
@RunWith(AndroidJUnit4.class)
public class LocalStoreTest {
 LocalStore store;JSONObject curriculum;
 @Before public void setup()throws Exception{android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();store=new LocalStore(context);store.clearData();try(java.io.InputStream stream=context.getAssets().open("curriculum.json")){java.io.ByteArrayOutputStream data=new java.io.ByteArrayOutputStream();byte[] bytes=new byte[4096];int n;while((n=stream.read(bytes))!=-1)data.write(bytes,0,n);curriculum=new JSONObject(data.toString("UTF-8"));}}
 @After public void close(){store.close();}
 JSONObject answer(int order,Object value,String event)throws Exception{return new JSONObject().put("lessonId","greetings-1").put("order",order).put("answer",value).put("eventId",event);}
 String event(){return UUID.randomUUID().toString();}
 void finishLesson()throws Exception{JSONArray exercises=curriculum.getJSONArray("lessons").getJSONObject(0).getJSONArray("exercises");for(int i=0;i<exercises.length();i++)store.attempt(answer(i,exercises.getJSONObject(i).get("answer"),event()));store.complete("greetings-1");}
 @Test public void originalCurriculumIsBundled()throws Exception{assertEquals(10,curriculum.getJSONArray("units").length());assertEquals(30,curriculum.getJSONArray("lessons").length());assertEquals(82,curriculum.getJSONArray("words").length());assertEquals(7,curriculum.getJSONArray("lessons").getJSONObject(0).getJSONArray("exercises").length());}
 @Test public void onboardingPersistsAcrossReopen()throws Exception{store.updateProfile(new JSONObject().put("name","Android Learner").put("locale","en").put("onboardingStep",3));store.close();store=new LocalStore(InstrumentationRegistry.getInstrumentation().getTargetContext());assertEquals(3,store.profile().getInt("onboardingStep"));assertEquals("Android Learner",store.profile().getString("name"));}
 @Test public void honestGradingAndIdempotentCompletion()throws Exception{String id=event();assertFalse(store.attempt(answer(0,"wrong",id)).getBoolean("correct"));assertFalse(store.attempt(answer(0,"wrong",id)).getBoolean("correct"));JSONArray exercises=curriculum.getJSONArray("lessons").getJSONObject(0).getJSONArray("exercises");for(int i=0;i<exercises.length();i++)store.attempt(answer(i,exercises.getJSONObject(i).get("answer"),event()));JSONObject completion=store.complete("greetings-1");assertEquals(86,completion.getInt("accuracy"));assertEquals(37,completion.getInt("points"));assertTrue(store.complete("greetings-1").getBoolean("duplicate"));assertEquals(37,store.state().getInt("points"));assertFalse(store.state().getBoolean("serverVerified"));assertEquals(2,store.state().getJSONArray("reviews").length());}
 @Test public void cannotSkipOrCompleteEarly()throws Exception{store.startLesson("greetings-1");try{store.attempt(answer(3,new JSONArray(),event()));fail("skip accepted");}catch(IllegalArgumentException expected){}try{store.complete("greetings-1");fail("early completion accepted");}catch(IllegalArgumentException expected){}}
 @Test public void reviewDuplicatesAndConflicts()throws Exception{finishLesson();JSONObject card=store.state().getJSONArray("reviews").getJSONObject(0);JSONObject review=new JSONObject().put("vocabularyId",card.getString("vocab_id")).put("expectedDue",card.getLong("due")).put("eventId",event()).put("rating","GOOD");store.review(review);assertTrue(store.review(review).getBoolean("duplicate"));assertEquals(42,store.state().getInt("points"));try{store.review(new JSONObject(review.toString()).put("eventId",event()));fail("stale due accepted");}catch(IllegalArgumentException expected){}}
 @Test public void writingAndExportAreRealDeviceRecords()throws Exception{store.saveWriting(new JSONObject().put("character","一").put("seconds",3).put("strokes",new JSONArray().put(new JSONArray().put(new JSONArray().put(50).put(150)).put(new JSONArray().put(250).put(150)))));JSONObject data=store.exportData();assertEquals(1,data.getJSONArray("writingData").length());assertFalse(data.has("passwordHash"));store.clearData();assertEquals(0,store.state().getJSONArray("writing").length());}
}
