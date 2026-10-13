package com.hanyuflow.android;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.PlaybackParams;
import android.os.Handler;
import android.os.Looper;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/** Playback of pre-generated Mandarin clips; no TTS engine, account or network. */
final class BundledSpeech {
    interface Listener { void update(JSONObject value); }
    private final Context context;
    private final Listener listener;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Map<String,JSONObject> clips=new HashMap<>();
    private MediaPlayer player;
    private String text="",clipId="";
    private float speed=1;
    private volatile JSONObject snapshot=new JSONObject();
    private final Runnable tick=new Runnable(){public void run(){if(player!=null){publish("playing",null);handler.postDelayed(this,100);}}};
    BundledSpeech(Context context,Listener listener)throws Exception{
        this.context=context;this.listener=listener;
        JSONObject manifest;
        try(java.io.InputStream in=context.getAssets().open("audio/manifest.json")){java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();byte[] bytes=new byte[4096];int n;while((n=in.read(bytes))!=-1)out.write(bytes,0,n);manifest=new JSONObject(new String(out.toByteArray(),StandardCharsets.UTF_8));}
        JSONArray list=manifest.getJSONArray("clips");
        for(int i=0;i<list.length();i++){JSONObject clip=list.getJSONObject(i);String key=canonical(clip.getString("text"));if(!key.equals(clip.getString("key")))throw new IllegalStateException("Audio manifest key mismatch");clips.put(key,clip);}
        publish("idle",null);
    }
    static String canonical(String text){return Normalizer.normalize(text,Normalizer.Form.NFKC).replaceAll("[\\s。！？，,.!?、]","");}
    int count(){return clips.size();}
    JSONObject state(){return snapshot;}
    void play(String phrase,boolean slow){
        stop();text=phrase;speed=slow?.65f:1f;
        JSONObject clip=clips.get(canonical(phrase));
        if(clip==null){publish("error","No bundled Mandarin clip for this text.");return;}
        try{
            clipId=clip.getString("id");player=new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            try(AssetFileDescriptor fd=context.getAssets().openFd(clip.getString("file"))){player.setDataSource(fd.getFileDescriptor(),fd.getStartOffset(),fd.getLength());}
            player.setOnCompletionListener(p->{handler.removeCallbacks(tick);publish("ended",null);p.release();player=null;});
            player.setOnErrorListener((p,what,extra)->{publish("error","Bundled audio playback failed ("+what+", "+extra+").");stop();return true;});
            player.prepare();
            player.setPlaybackParams(new PlaybackParams().setSpeed(speed).setPitch(1f).setAudioFallbackMode(PlaybackParams.AUDIO_FALLBACK_MODE_DEFAULT));
            player.start();publish("playing",null);handler.postDelayed(tick,100);
        }catch(Exception e){publish("error",e.getMessage());handler.removeCallbacks(tick);if(player!=null){player.release();player=null;}}
    }
    void stop(){handler.removeCallbacks(tick);if(player!=null){publish("stopped",null);player.release();player=null;}}
    private void publish(String status,String error){
        int duration=0,position=0;boolean playing=false;
        try{if(player!=null){duration=player.getDuration();position=player.getCurrentPosition();playing=player.isPlaying();}}catch(IllegalStateException ignored){}
        try{JSONObject value=new JSONObject().put("status",status).put("text",text).put("clipId",clipId).put("speed",speed).put("pitch",1).put("source","bundled-ai-generated").put("offline",true).put("durationMs",duration).put("positionMs",position).put("isPlaying",playing);if(error!=null)value.put("error",error);snapshot=value;listener.update(value);}catch(Exception ignored){}
    }
}
