<img width="64" height="64" alt="icon" src="https://github.com/user-attachments/assets/c028a386-8dd6-4db9-aa19-0ead6bfa6d77" />

# Balon content blocker 

FF: https://addons.mozilla.org/en-US/firefox/addon/balon-content-blocker

Chrome : https://chromewebstore.google.com/search/Balon%20-%20LLM-assisted%20content%20blocker
<hr/>

Balon filters social media posts through an LLM to help you block content you don't want to see.

Here's how it works :

- Craft a prompt that explains the things you rather not see. For example :

        If the following text includes any negative opinion towards paellas, return "paella".

- Make sure that your prompt asks for one word (to save tokens & time) and for ok if other conditions are not met. So your prompt could be :

        Answer only with one word. If the following text includes any negative opinion towards paellas, return "paella". If it is about pomegranates or other sour fruits, return "pomegranate". Otherwise return "ok".

- Connect balon to a LLM. The best way to do this is to serve a model running on your machine through localhost. Balon allows you to choose the port number.

- If you prefer, you can connect to OpenAI,Google or Anthropic and specify a model name and API Key. This extension does not collect the information you provide. Keep in mind that a separate API call will be made for each comment on the page you visit. 

- After you entered the necessary information, hit save on the popup and browse one of the following :

        reddit
        youtube
        x
        hackernews


- If your prompt returns any other word than ok, a box will appear on that comment and a label will show the returned word. So in our example, posts about sour fruits will have a box with the label pomegranate on them.

- You can dismiss the box by clicking on it and read the content underneath.

- By default, comments that are not checked will have a box with the label Checking... on them. This behavior can be disabled from the pop-up menu.
