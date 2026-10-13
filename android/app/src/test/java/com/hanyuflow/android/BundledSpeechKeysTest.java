package com.hanyuflow.android;
import org.junit.Test;
import static org.junit.Assert.*;
public class BundledSpeechKeysTest {
    @Test public void punctuationMapsToTheSameMandarinClip(){assertEquals("你好我叫安娜",BundledSpeech.canonical("你好！ 我叫安娜。"));assertEquals(BundledSpeech.canonical("你好"),BundledSpeech.canonical("你 好!"));}
    @Test public void differentWordsAndMissingAnswersStayDistinct(){assertNotEquals(BundledSpeech.canonical("一"),BundledSpeech.canonical("二"));assertTrue(BundledSpeech.canonical("我喝____。").contains("____"));}
}
