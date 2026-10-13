package com.hanyuflow.android;
import android.content.Context;
import android.media.MediaPlayer;
import android.content.res.AssetFileDescriptor;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
public class BundledSpeechDeviceTest {
    @Test public void everyBundledClipDecodesWithAndroidMediaPlayer()throws Exception{
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        JSONObject manifest;try(java.io.InputStream in=context.getAssets().open("audio/manifest.json")){java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1)out.write(b,0,n);manifest=new JSONObject(out.toString("UTF-8"));}
        JSONArray clips=manifest.getJSONArray("clips");assertEquals(200,clips.length());
        for(int i=0;i<clips.length();i++){JSONObject clip=clips.getJSONObject(i);assertEquals(clip.getString("key"),BundledSpeech.canonical(clip.getString("text")));MediaPlayer player=new MediaPlayer();try(AssetFileDescriptor fd=context.getAssets().openFd(clip.getString("file"))){player.setDataSource(fd.getFileDescriptor(),fd.getStartOffset(),fd.getLength());player.prepare();assertTrue(clip.getString("id"),player.getDuration()>200);assertEquals(clip.getInt("durationMs"),player.getDuration(),120);}finally{player.release();}}
    }
}
