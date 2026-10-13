package com.hanyuflow.android;

import android.Manifest;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.*;
import androidx.webkit.WebViewAssetLoader;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.Executors;
import org.json.*;

public final class MainActivity extends ComponentActivity {
    private static final String LOCAL_URL="https://appassets.androidplatform.net/assets/index.html";
    private static final int MICROPHONE=41, EXPORT=42;
    private WebView web;
    private LinearLayout root,toolbar;
    private LocalStore store;
    private BundledSpeech speech;
    private volatile boolean localMode=true;
    private String backend="",pendingExport="";
    private MediaRecorder recorder;
    private MediaPlayer player;
    private File recordingFile;
    private String guidedPhrase="";
    private long recordingStartedAt=0;
    private PermissionRequest pendingWebPermission;
    private boolean pendingLocalRecording=false;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable recordingTimeout=()->stopRecording();

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        try{store=new LocalStore(this);}catch(Exception e){new AlertDialog.Builder(this).setMessage("Local curriculum could not load: "+e.getMessage()).setPositiveButton("Close",(d,w)->finish()).show();return;}
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(248,250,253));setContentView(root);
        root.setOnApplyWindowInsetsListener((view,insets)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);}else view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;
        });
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){@Override public void handleOnBackPressed(){handleBack();}});
        backend=getPreferences(MODE_PRIVATE).getString("backend","");
        try{speech=new BundledSpeech(this,value->emit("audio",value));}catch(Exception e){message("Bundled Mandarin audio unavailable: "+e.getMessage());}
        switchMode(false);
    }
    private JSONObject capabilities(){JSONObject value=new JSONObject();try{value.put("ttsReady",speech!=null).put("mandarinVoice",speech!=null).put("bundledAudio",speech!=null).put("audioClips",speech==null?0:speech.count()).put("audioSource","Kokoro-82M-v1.1-zh / zf_001").put("microphoneGranted",checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED).put("ai",false).put("transcription",false).put("pronunciation",false).put("backend",backend).put("serverVerified",false);}catch(Exception ignored){}return value;}
    private void emit(String type,JSONObject data){handler.post(()->{if(web!=null&&localMode){try{JSONObject event=new JSONObject().put("type",type).put("data",data);web.evaluateJavascript("window.dispatchEvent(new CustomEvent('hanyu-native',{detail:"+event+"}))",null);}catch(Exception ignored){}}});}
    private void message(String text){try{emit("message",new JSONObject().put("message",text));}catch(Exception ignored){}}
    @SuppressWarnings("SetJavaScriptEnabled") private void switchMode(boolean online){
        stopRecording();if(speech!=null)speech.stop();localMode=!online;
        if(web!=null){web.removeJavascriptInterface("HanyuNative");root.removeView(web);web.destroy();}
        if(toolbar!=null)root.removeView(toolbar);
        toolbar=new LinearLayout(this);toolbar.setPadding(12,4,12,4);toolbar.setBackgroundColor(Color.rgb(234,242,255));TextView label=new TextView(this);label.setText(R.string.online_backend);label.setTextSize(12);toolbar.addView(label,new LinearLayout.LayoutParams(0,LinearLayout.LayoutParams.WRAP_CONTENT,1));Button back=new Button(this);back.setText(R.string.device_mode);back.setOnClickListener(v->switchMode(false));toolbar.addView(back);toolbar.setVisibility(online?View.VISIBLE:View.GONE);root.addView(toolbar);
        web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,0,1));web.setBackgroundColor(Color.rgb(248,250,253));
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);settings.setBuiltInZoomControls(false);
        if(BuildConfig.DEBUG)WebView.setWebContentsDebuggingEnabled(true);
        WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                if(!localMode)return null;
                WebResourceResponse response=loader.shouldInterceptRequest(request.getUrl());
                return response!=null?response:new WebResourceResponse("text/plain","UTF-8",403,"Blocked",null,new ByteArrayInputStream("External resources are blocked in device mode".getBytes(StandardCharsets.UTF_8)));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri url=request.getUrl();if(localMode)return !url.getHost().equals("appassets.androidplatform.net");if(sameOrigin(url,Uri.parse(backend)))return false;if("https".equals(url.getScheme())){try{startActivity(new Intent(Intent.ACTION_VIEW,url));}catch(Exception e){showBackendError("No browser can open this link.");}}return true;}
            @Override public void onReceivedSslError(WebView view,android.webkit.SslErrorHandler handler,android.net.http.SslError error){handler.cancel();showBackendError("Backend HTTPS certificate is not trusted. Device lessons remain available.");}
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame()&&!localMode)showBackendError("Backend is unreachable. Check its HTTPS URL and phone connectivity.");}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onJsConfirm(WebView view,String url,String text,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(text).setPositiveButton("OK",(d,w)->result.confirm()).setNegativeButton("Cancel",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
            @Override public void onPermissionRequest(PermissionRequest request){handler.post(()->{
                if(localMode||!sameOrigin(request.getOrigin(),Uri.parse(backend))||!java.util.Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)){request.deny();return;}
                if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});else{pendingWebPermission=request;requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},MICROPHONE);}
            });}
            @Override public void onPermissionRequestCanceled(PermissionRequest request){if(pendingWebPermission==request)pendingWebPermission=null;}
        });
        if(localMode){web.addJavascriptInterface(new Bridge(),"HanyuNative");web.loadUrl(LOCAL_URL);}else web.loadUrl(backend+"/login");
    }
    private boolean sameOrigin(Uri a,Uri b){return a!=null&&b!=null&&java.util.Objects.equals(a.getScheme(),b.getScheme())&&java.util.Objects.equals(a.getHost(),b.getHost())&&a.getPort()==b.getPort();}
    private void showBackendError(String text){handler.post(()->new AlertDialog.Builder(this).setMessage(text).setPositiveButton("Device mode",(d,w)->switchMode(false)).setNegativeButton("Retry",(d,w)->switchMode(true)).show());}
    private void handleBack(){if(!localMode){if(web.canGoBack())web.goBack();else switchMode(false);return;}web.evaluateJavascript("window.handleAndroidBack ? window.handleAndroidBack() : false",result->{if(!"true".equals(result))new AlertDialog.Builder(this).setMessage("Exit HanyuFlow? Your device progress is saved.").setPositiveButton("Exit",(d,w)->finish()).setNegativeButton("Stay",null).show();});}
    private void beginRecording(){
        if(recorder!=null){message("Already recording");return;}
        try{if(speech!=null)speech.stop();if(recordingFile!=null)recordingFile.delete();recordingFile=new File(getCacheDir(),"hanyuflow-recording-"+UUID.randomUUID()+".m4a");recorder=new MediaRecorder();recorder.setAudioSource(MediaRecorder.AudioSource.MIC);recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);recorder.setOutputFile(recordingFile.getAbsolutePath());recorder.prepare();recorder.start();recordingStartedAt=android.os.SystemClock.elapsedRealtime();handler.postDelayed(recordingTimeout,60000);emit("recording",new JSONObject().put("status","recording").put("uploaded",false));}catch(Exception e){if(recorder!=null){recorder.release();recorder=null;}message("Recording unavailable: "+e.getMessage());}
    }
    private void stopRecording(){handler.removeCallbacks(recordingTimeout);if(recorder==null)return;boolean saved=true;try{recorder.stop();}catch(Exception e){saved=false;if(recordingFile!=null)recordingFile.delete();}finally{recorder.release();recorder=null;}try{long ms=Math.max(0,android.os.SystemClock.elapsedRealtime()-recordingStartedAt);JSONObject value=new JSONObject().put("status",saved?"ready":"empty").put("uploaded",false).put("durationMs",ms).put("assessed",false);if(saved&&!guidedPhrase.isEmpty()&&ms>=500)value.put("practice",store.recordSpeaking(guidedPhrase,ms));emit("recording",value);}catch(Exception e){message("Recording saved; practice record unavailable: "+e.getMessage());}guidedPhrase="";}
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code!=MICROPHONE)return;boolean granted=results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED;if(pendingWebPermission!=null){if(granted)pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});else pendingWebPermission.deny();pendingWebPermission=null;}if(pendingLocalRecording){pendingLocalRecording=false;if(granted)beginRecording();else message("Microphone permission denied. Enable it in Android app settings to retry.");}emit("capabilities",capabilities());}
    @Override protected void onPause(){super.onPause();stopRecording();if(speech!=null)speech.stop();if(player!=null){player.release();player=null;}}
    @Override protected void onDestroy(){stopRecording();if(player!=null)player.release();if(speech!=null)speech.stop();if(web!=null)web.destroy();if(store!=null)store.close();super.onDestroy();}
    @Override public void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==EXPORT&&result==RESULT_OK&&data!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(pendingExport.getBytes(StandardCharsets.UTF_8));message("Device learning data exported.");}catch(Exception e){message("Export failed: "+e.getMessage());}pendingExport="";}}
    private final class Bridge {
        @JavascriptInterface public String request(String method,String text){
            try{if(!localMode)throw new IllegalStateException("Device bridge is unavailable in backend mode");if(text.length()>160000)throw new IllegalArgumentException("Request too large");JSONObject input=new JSONObject(text);Object result;
                switch(method){
                    case "state":result=store.state();break;
                    case "profile":result=store.updateProfile(input);break;
                    case "lesson":result=store.startLesson(input.getString("id"));break;
                    case "attempt":result=store.attempt(input);break;
                    case "complete":result=store.complete(input.getString("id"));break;
                    case "programStart":result=store.programStart(input);break;
                    case "programAttempt":result=store.programAttempt(input);break;
                    case "programHelp":result=store.programHelp(input);break;
                    case "programComplete":result=store.programComplete(input.getString("runId"));break;
                    case "programMistakes":result=store.programMistakes();break;
                    case "programPractice":result=store.programPractice(input);break;
                    case "speakingSelfCheck":result=store.speakingSelfCheck(input);break;
                    case "review":result=store.review(input);break;
                    case "writing":result=store.saveWriting(input);break;
                    case "capabilities":result=capabilities();break;
                    case "uuid":result=UUID.randomUUID().toString();break;
                    case "export":pendingExport=store.exportData().toString(2);handler.post(()->{Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.setType("application/json");intent.addCategory(Intent.CATEGORY_OPENABLE);intent.putExtra(Intent.EXTRA_TITLE,"hanyuflow-device-data.json");startActivityForResult(intent,EXPORT);});result=new JSONObject().put("pending",true);break;
                    case "deleteData":handler.post(()->new AlertDialog.Builder(MainActivity.this).setMessage("Delete all device learning data? This does not delete any server account.").setPositiveButton("Delete",(d,w)->{store.clearData();if(recordingFile!=null)recordingFile.delete();switchMode(false);}).setNegativeButton("Cancel",null).show());result=new JSONObject().put("pending",true);break;
                    case "speak":String phrase=input.getString("text");if(phrase.length()>1200)throw new IllegalArgumentException("Speech text too long");handler.post(()->{if(speech==null){message("Bundled Mandarin audio could not load.");return;}if(player!=null){player.release();player=null;}speech.play(phrase,input.optBoolean("slow"));});result=new JSONObject().put("pending",true);break;
                    case "audioState":result=speech==null?new JSONObject().put("status","unavailable"):speech.state();break;
                    case "audioStop":handler.post(()->{if(speech!=null)speech.stop();});result=new JSONObject().put("pending",true);break;
                    case "recordStart":String requestedPhrase=input.optString("phrase","");if(!requestedPhrase.isEmpty()&&!store.validSpeakingPhrase(requestedPhrase))throw new IllegalArgumentException("Unknown guided speaking phrase");guidedPhrase=requestedPhrase;handler.post(()->{if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)beginRecording();else{pendingLocalRecording=true;requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},MICROPHONE);}});result=new JSONObject().put("pending",true);break;
                    case "recordStop":handler.post(()->stopRecording());result=new JSONObject().put("pending",true);break;
                    case "recordReplay":handler.post(()->{try{if(recordingFile==null||!recordingFile.exists())throw new IllegalStateException("No recording available");if(speech!=null)speech.stop();if(player!=null)player.release();player=new MediaPlayer();player.setDataSource(recordingFile.getAbsolutePath());player.prepare();player.setPlaybackParams(player.getPlaybackParams().setSpeed(input.optBoolean("slow")?.65f:1f));player.start();}catch(Exception e){message("Replay unavailable: "+e.getMessage());}});result=new JSONObject().put("pending",true);break;
                    case "recordDelete":handler.post(()->{stopRecording();if(player!=null){player.release();player=null;}if(recordingFile!=null)recordingFile.delete();try{emit("recording",new JSONObject().put("status","empty"));}catch(Exception ignored){}});result=new JSONObject().put("pending",true);break;
                    case "backend":String requested=input.getString("url").replaceAll("/+$","");if(!LearningRules.validBackend(requested))throw new IllegalArgumentException("Use a reachable HTTPS backend origin. localhost/127.0.0.1 is the phone itself, not your laptop.");java.util.concurrent.ExecutorService executor=Executors.newSingleThreadExecutor();executor.execute(()->{try{HttpURLConnection connection=(HttpURLConnection)new URL(requested+"/api/capabilities").openConnection();connection.setConnectTimeout(10000);connection.setReadTimeout(10000);connection.setInstanceFollowRedirects(false);if(connection.getResponseCode()!=200)throw new IOException("Backend capability check failed");try(InputStream stream=connection.getInputStream()){ByteArrayOutputStream buffer=new ByteArrayOutputStream();byte[] bytes=new byte[4096];int n;while((n=stream.read(bytes))!=-1){buffer.write(bytes,0,n);if(buffer.size()>100000)throw new IOException("Response too large");}JSONObject cap=new JSONObject(buffer.toString("UTF-8"));if(!cap.has("data")||!cap.getJSONObject("data").has("ai"))throw new IOException("This is not a compatible HanyuFlow backend");}connection.disconnect();backend=requested;getPreferences(MODE_PRIVATE).edit().putString("backend",backend).apply();handler.post(()->switchMode(true));}catch(Exception e){message("Backend unavailable: "+e.getMessage()+". Device practice still works offline.");}finally{executor.shutdown();}});result=new JSONObject().put("pending",true);break;
                    default:throw new IllegalArgumentException("Unsupported native operation");
                }
                return new JSONObject().put("data",result).toString();
            }catch(Exception e){try{return new JSONObject().put("error",e.getMessage()==null?"Operation failed":e.getMessage()).toString();}catch(Exception ignored){return "{\"error\":\"Operation failed\"}";}}
        }
    }
}
