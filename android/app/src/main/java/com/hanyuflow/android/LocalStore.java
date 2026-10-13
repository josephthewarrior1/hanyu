package com.hanyuflow.android;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.content.ContentValues;
import org.json.JSONObject;
import org.json.JSONArray;
import java.time.LocalDate;
import java.util.TimeZone;
import java.nio.charset.StandardCharsets;

/** Device practice is independent from server accounts and server-verified XP. */
public final class LocalStore extends SQLiteOpenHelper {
    private final JSONObject curriculum;
    private final JSONObject programData;
    private final ProgramStore program;
    public LocalStore(Context context) throws Exception {
        super(context,"hanyuflow-device.db",null,2);
        try(java.io.InputStream in=context.getAssets().open("curriculum.json")){java.io.ByteArrayOutputStream buffer=new java.io.ByteArrayOutputStream();byte[] bytes=new byte[4096];int n;while((n=in.read(bytes))!=-1)buffer.write(bytes,0,n);curriculum=new JSONObject(buffer.toString("UTF-8"));}
        try(java.io.InputStream in=context.getAssets().open("program.json")){java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();byte[] bytes=new byte[4096];int n;while((n=in.read(bytes))!=-1)out.write(bytes,0,n);programData=new JSONObject(out.toString("UTF-8"));}
        program=new ProgramStore(getWritableDatabase(),programData,curriculum,System::currentTimeMillis);
    }
    @Override public void onCreate(SQLiteDatabase db){
        db.execSQL("CREATE TABLE settings (key TEXT PRIMARY KEY,value TEXT NOT NULL)");
        db.execSQL("CREATE TABLE progress (lesson_id TEXT PRIMARY KEY,cursor INTEGER NOT NULL DEFAULT 0,accuracy INTEGER,completed_at INTEGER,started_at INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE attempts (event_id TEXT PRIMARY KEY,lesson_id TEXT NOT NULL,exercise_order INTEGER NOT NULL,attempt_no INTEGER NOT NULL,answer TEXT NOT NULL,correct INTEGER NOT NULL,created_at INTEGER NOT NULL,UNIQUE(lesson_id,exercise_order,attempt_no))");
        db.execSQL("CREATE TABLE reviews (vocab_id TEXT PRIMARY KEY,due INTEGER NOT NULL,ease REAL NOT NULL DEFAULT 2.5,interval_days REAL NOT NULL DEFAULT 0,repetitions INTEGER NOT NULL DEFAULT 0,lapses INTEGER NOT NULL DEFAULT 0,last_review INTEGER)");
        db.execSQL("CREATE INDEX review_due ON reviews(due)");
        db.execSQL("CREATE TABLE review_log (event_id TEXT PRIMARY KEY,vocab_id TEXT NOT NULL,rating TEXT NOT NULL,previous_due INTEGER NOT NULL,next_due INTEGER NOT NULL,created_at INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE practice_points (event_id TEXT PRIMARY KEY,amount INTEGER NOT NULL,kind TEXT NOT NULL,created_at INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE writing (id INTEGER PRIMARY KEY AUTOINCREMENT,character TEXT NOT NULL,strokes TEXT NOT NULL,seconds INTEGER NOT NULL,created_at INTEGER NOT NULL)");
        ProgramStore.createTables(db);
        db.execSQL("CREATE TABLE sessions (id INTEGER PRIMARY KEY AUTOINCREMENT,lesson_id TEXT UNIQUE,seconds INTEGER NOT NULL,created_at INTEGER NOT NULL)");
    }
    @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion){if(oldVersion==1&&newVersion==2){ProgramStore.createTables(db);ProgramStore.migrateLegacyMistakes(db);}else throw new IllegalStateException("Unsupported migration");}
    private String setting(String key,String fallback){try(Cursor c=getReadableDatabase().rawQuery("SELECT value FROM settings WHERE key=?",new String[]{key})){return c.moveToFirst()?c.getString(0):fallback;}}
    private void putSetting(String key,String value){ContentValues v=new ContentValues();v.put("key",key);v.put("value",value);getWritableDatabase().insertWithOnConflict("settings",null,v,SQLiteDatabase.CONFLICT_REPLACE);}
    public synchronized JSONObject profile() throws Exception {return new JSONObject(setting("profile",new JSONObject().put("name","Pelajar").put("locale","id").put("experience","beginner").put("goal","travel").put("dailyMinutes",10).put("timezone",TimeZone.getDefault().getID()).put("onboardingStep",0).put("onboardingDone",false).put("pinyin",true).put("theme","light").put("favorites",new JSONArray()).toString()));}
    public synchronized JSONObject updateProfile(JSONObject input) throws Exception {
        JSONObject p=profile();
        for(String key:java.util.Arrays.asList("name","locale","experience","goal","dailyMinutes","timezone","onboardingStep","onboardingDone","pinyin","theme","favorites"))if(input.has(key))p.put(key,input.get(key));
        if(p.getString("name").length()<2||p.getString("name").length()>60)throw new IllegalArgumentException("Name must contain 2–60 characters");
        if(!java.util.Arrays.asList("id","en").contains(p.getString("locale")))throw new IllegalArgumentException("Invalid language");
        if(!java.util.Arrays.asList(5,10,15,20,30).contains(p.getInt("dailyMinutes")))throw new IllegalArgumentException("Invalid daily minutes");
        if(!java.util.Arrays.asList("light","dark","system").contains(p.getString("theme")))throw new IllegalArgumentException("Invalid theme");
        java.time.ZoneId.of(p.getString("timezone"));
        if(p.getInt("onboardingStep")<0||p.getInt("onboardingStep")>5)throw new IllegalArgumentException("Invalid onboarding step");
        if(p.getJSONArray("favorites").length()>500)throw new IllegalArgumentException("Too many favorites");
        if(input.has("placementAnswers")){JSONArray a=input.getJSONArray("placementAnswers");if(a.length()!=3)throw new IllegalArgumentException("Three placement answers required");int score=0;String[] answers={"hello","wǒ","我喝水"};for(int i=0;i<3;i++)if(answers[i].equals(a.optString(i)))score++;p.put("placementScore",score);}
        putSetting("profile",p.toString());return p;
    }
    private JSONObject lesson(String id)throws Exception {JSONArray lessons=curriculum.getJSONArray("lessons");for(int i=0;i<lessons.length();i++)if(lessons.getJSONObject(i).getString("id").equals(id))return lessons.getJSONObject(i);throw new IllegalArgumentException("Lesson not found");}
    public synchronized JSONObject startLesson(String id)throws Exception {
        lesson(id);getWritableDatabase().execSQL("INSERT OR IGNORE INTO progress(lesson_id,started_at) VALUES (?,?)",new Object[]{id,System.currentTimeMillis()});
        JSONObject p=new JSONObject();try(Cursor c=getReadableDatabase().rawQuery("SELECT cursor,accuracy,completed_at,started_at FROM progress WHERE lesson_id=?",new String[]{id})){if(c.moveToFirst()){p.put("cursor",c.getInt(0));p.put("accuracy",c.isNull(1)?JSONObject.NULL:c.getInt(1));p.put("completedAt",c.isNull(2)?JSONObject.NULL:c.getLong(2));p.put("startedAt",c.getLong(3));}}
        JSONArray attempts=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery("SELECT exercise_order,attempt_no,answer,correct FROM attempts WHERE lesson_id=? ORDER BY exercise_order,attempt_no",new String[]{id})){while(c.moveToNext())attempts.put(new JSONObject().put("order",c.getInt(0)).put("attemptNo",c.getInt(1)).put("answer",new JSONObject(c.getString(2)).get("answer")).put("correct",c.getInt(3)==1));}p.put("attempts",attempts);return p;
    }
    public synchronized JSONObject attempt(JSONObject input)throws Exception {
        String id=input.getString("lessonId"),event=input.getString("eventId");java.util.UUID.fromString(event);int order=input.getInt("order");Object answer=input.get("answer");
        JSONObject l=lesson(id);JSONArray exercises=l.getJSONArray("exercises");if(order<0||order>=exercises.length())throw new IllegalArgumentException("Exercise not found");JSONObject e=exercises.getJSONObject(order);
        if(input.toString().length()>10000)throw new IllegalArgumentException("Answer too large");
        SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{
            try(Cursor c=db.rawQuery("SELECT lesson_id,exercise_order,answer,correct FROM attempts WHERE event_id=?",new String[]{event})){if(c.moveToFirst()){if(!c.getString(0).equals(id)||c.getInt(1)!=order||!c.getString(2).equals(new JSONObject().put("answer",answer).toString()))throw new IllegalArgumentException("Attempt identity conflict");db.setTransactionSuccessful();return new JSONObject().put("correct",c.getInt(3)==1).put("answer",e.get("answer")).put("explanation",e.getJSONObject("explanation"));}}
            JSONObject p=startLesson(id);if(!p.isNull("completedAt"))throw new IllegalArgumentException("Lesson already completed");if(order>p.getInt("cursor"))throw new IllegalArgumentException("Answer in order");
            int count=0;try(Cursor c=db.rawQuery("SELECT COUNT(*) FROM attempts WHERE lesson_id=? AND exercise_order=?",new String[]{id,String.valueOf(order)})){if(c.moveToFirst())count=c.getInt(0);}if(count>=10)throw new IllegalArgumentException("Exercise attempt limit reached");
            boolean correct=LearningRules.grade(e.getString("type"),answer,e.get("answer"),e.optJSONArray("alternatives")==null?new JSONArray():e.getJSONArray("alternatives"));
            db.execSQL("INSERT INTO attempts VALUES (?,?,?,?,?,?,?)",new Object[]{event,id,order,count+1,new JSONObject().put("answer",answer).toString(),correct?1:0,System.currentTimeMillis()});
            db.execSQL("UPDATE progress SET cursor=MAX(cursor,?) WHERE lesson_id=?",new Object[]{order+1,id});
            db.setTransactionSuccessful();return new JSONObject().put("correct",correct).put("answer",e.get("answer")).put("explanation",e.getJSONObject("explanation"));
        }finally{db.endTransaction();}
    }
    private void recordStreak(long now)throws Exception {String today=LearningRules.day(now,profile().getString("timezone"));String last=setting("streak_day",null);int current=Integer.parseInt(setting("streak_count","0"));putSetting("streak_count",String.valueOf(LearningRules.nextStreak(last,current,today)));putSetting("streak_day",today);}
    public synchronized JSONObject complete(String id)throws Exception {
        JSONObject l=lesson(id);SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{
            JSONObject p=startLesson(id);int prior=0;try(Cursor c=db.rawQuery("SELECT amount FROM practice_points WHERE event_id=?",new String[]{"lesson:"+id})){if(c.moveToFirst())prior=c.getInt(0);}
            if(!p.isNull("completedAt")){db.setTransactionSuccessful();return new JSONObject().put("accuracy",p.getInt("accuracy")).put("points",prior).put("duplicate",true).put("words",l.getJSONArray("vocabulary").length());}
            JSONArray exercises=l.getJSONArray("exercises");int firstCorrect=0,latestCorrect=0;
            for(int i=0;i<exercises.length();i++){try(Cursor c=db.rawQuery("SELECT correct FROM attempts WHERE lesson_id=? AND exercise_order=? ORDER BY attempt_no",new String[]{id,String.valueOf(i)})){if(!c.moveToFirst())throw new IllegalArgumentException("Answer every exercise");if(c.getInt(0)==1)firstCorrect++;if(c.moveToLast()&&c.getInt(0)==1)latestCorrect++;}}
            int mastery=Math.round(100f*latestCorrect/exercises.length());if(mastery<l.getInt("threshold"))throw new IllegalArgumentException("Review mistakes and retry before completing");
            int accuracy=Math.round(100f*firstCorrect/exercises.length()),points=20+Math.round(accuracy/5f);long now=System.currentTimeMillis();
            db.execSQL("UPDATE progress SET accuracy=?,completed_at=? WHERE lesson_id=?",new Object[]{accuracy,now,id});db.execSQL("INSERT OR IGNORE INTO practice_points VALUES (?,?,?,?)",new Object[]{"lesson:"+id,points,"LESSON",now});
            JSONArray vocabulary=l.getJSONArray("vocabulary");for(int i=0;i<vocabulary.length();i++)db.execSQL("INSERT OR IGNORE INTO reviews(vocab_id,due) VALUES (?,?)",new Object[]{vocabulary.getString(i),now});
            db.execSQL("INSERT OR IGNORE INTO sessions(lesson_id,seconds,created_at) VALUES (?,?,?)",new Object[]{id,Math.max(0,Math.min(1800,(now-p.getLong("startedAt"))/1000)),now});recordStreak(now);
            db.setTransactionSuccessful();return new JSONObject().put("accuracy",accuracy).put("mastery",mastery).put("points",points).put("duplicate",false).put("words",vocabulary.length());
        }finally{db.endTransaction();}
    }
    public synchronized JSONObject review(JSONObject input)throws Exception {
        String id=input.getString("vocabularyId"),event=input.getString("eventId"),rating=input.getString("rating");java.util.UUID.fromString(event);SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{
            try(Cursor c=db.rawQuery("SELECT vocab_id,rating,next_due FROM review_log WHERE event_id=?",new String[]{event})){if(c.moveToFirst()){if(!id.equals(c.getString(0))||!rating.equals(c.getString(1)))throw new IllegalArgumentException("Review identity conflict");db.setTransactionSuccessful();return new JSONObject().put("due",c.getLong(2)).put("duplicate",true);}}
            JSONObject next;long oldDue,now=System.currentTimeMillis();try(Cursor c=db.rawQuery("SELECT due,ease,interval_days,repetitions,lapses FROM reviews WHERE vocab_id=?",new String[]{id})){if(!c.moveToFirst())throw new IllegalArgumentException("Card not found");oldDue=c.getLong(0);if(oldDue!=input.getLong("expectedDue"))throw new IllegalArgumentException("Card changed; refresh");if(oldDue>now)throw new IllegalArgumentException("Card not due");next=LearningRules.schedule(c.getDouble(1),c.getDouble(2),c.getInt(3),c.getInt(4),rating,now);}
            db.execSQL("UPDATE reviews SET due=?,ease=?,interval_days=?,repetitions=?,lapses=?,last_review=? WHERE vocab_id=?",new Object[]{next.getLong("due"),next.getDouble("ease"),next.getDouble("interval"),next.getInt("repetitions"),next.getInt("lapses"),now,id});
            db.execSQL("INSERT INTO review_log VALUES (?,?,?,?,?,?)",new Object[]{event,id,rating,oldDue,next.getLong("due"),now});db.execSQL("INSERT INTO practice_points VALUES (?,?,?,?)",new Object[]{"review:"+event,2,"REVIEW",now});recordStreak(now);db.setTransactionSuccessful();return next.put("points",2).put("duplicate",false);
        }finally{db.endTransaction();}
    }
    private JSONArray rows(String sql)throws Exception {JSONArray result=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery(sql,null)){while(c.moveToNext()){JSONObject row=new JSONObject();for(int i=0;i<c.getColumnCount();i++)row.put(c.getColumnName(i),c.isNull(i)?JSONObject.NULL:c.getType(i)==Cursor.FIELD_TYPE_INTEGER?c.getLong(i):c.getType(i)==Cursor.FIELD_TYPE_FLOAT?c.getDouble(i):c.getString(i));result.put(row);}}return result;}
    public synchronized JSONObject state()throws Exception {
        long now=System.currentTimeMillis();JSONObject p=profile();JSONArray activity=rows("SELECT amount,kind,created_at FROM practice_points ORDER BY created_at");int points=0;for(int i=0;i<activity.length();i++)points+=activity.getJSONObject(i).getInt("amount");String last=setting("streak_day",null);int streak=Integer.parseInt(setting("streak_count","0"));String today=LearningRules.day(now,p.getString("timezone"));if(last==null||LocalDate.parse(last).plusDays(1).isBefore(LocalDate.parse(today)))streak=0;
        return new JSONObject().put("now",now).put("profile",p).put("progress",rows("SELECT * FROM progress")).put("reviews",rows("SELECT * FROM reviews ORDER BY due")).put("activity",activity).put("points",points).put("streak",streak).put("writing",rows("SELECT id,character,seconds,created_at FROM writing")).put("sessions",rows("SELECT * FROM sessions")).put("program",program.summary(p.getString("timezone"))).put("mode","DEVICE_PRACTICE").put("serverVerified",false);
    }
    public synchronized JSONObject programStart(JSONObject input)throws Exception{return program.start(input.getString("id"),input.optBoolean("restart"),profile().getString("timezone"));}
    public synchronized JSONObject programAttempt(JSONObject input)throws Exception{return program.attempt(input);}
    public synchronized JSONObject programHelp(JSONObject input)throws Exception{return program.help(input);}
    public synchronized JSONObject programComplete(String id)throws Exception{JSONObject result=program.complete(id);if(result.optInt("points")>0)recordStreak(System.currentTimeMillis());return result;}
    public synchronized JSONObject programMistakes()throws Exception{return program.mistakes();}
    public synchronized JSONObject programPractice(JSONObject input)throws Exception{return program.practice(input);}
    public synchronized boolean validSpeakingPhrase(String phrase)throws Exception{return program.validSpeakingPhrase(phrase);}
    public synchronized JSONObject recordSpeaking(String phrase,long ms)throws Exception{return program.recordSpeaking(phrase,ms);}
    public synchronized JSONObject speakingSelfCheck(JSONObject input)throws Exception{return program.selfCheck(input.getString("id"),input.getString("value"));}
    public synchronized JSONObject saveWriting(JSONObject input)throws Exception {String character=input.getString("character");if(!java.util.Arrays.asList("一","二","三","十").contains(character)||input.getJSONArray("strokes").length()<1||input.toString().length()>150000)throw new IllegalArgumentException("Invalid writing session");int seconds=Math.max(0,Math.min(1800,input.getInt("seconds")));getWritableDatabase().execSQL("INSERT INTO writing(character,strokes,seconds,created_at) VALUES (?,?,?,?)",new Object[]{character,input.getJSONArray("strokes").toString(),seconds,System.currentTimeMillis()});return new JSONObject().put("saved",true);}
    public synchronized JSONObject exportData()throws Exception {return state().put("programData",program.export()).put("attempts",rows("SELECT * FROM attempts")).put("reviewHistory",rows("SELECT * FROM review_log")).put("writingData",rows("SELECT * FROM writing"));}
    public synchronized void clearData(){SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{ProgramStore.clear(db);for(String table:java.util.Arrays.asList("settings","progress","attempts","reviews","review_log","practice_points","writing","sessions"))db.delete(table,null,null);db.setTransactionSuccessful();}finally{db.endTransaction();}}
}
