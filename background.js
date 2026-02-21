const api = globalThis.browser ?? globalThis.chrome;

const DEFAULTS = {
  enabled: true,
  endpointUrl: "http://localhost",
  portNumber:"8089",
  modelName:"gpt-4.1",
  secretToken:"token",
  proompt: 'Answer only with one word. If the following text includes any negative opinion towards paellas, return "paella". Otherwise return "ok".'
};
    
api.runtime.onMessage?.addListener((msg, sender, sendResponse) => {

  if (msg?.type !== "checkText") return;
  (async () => {

  let PREFS = { ...DEFAULTS };
  PREFS = await api.storage.local.get(DEFAULTS);

    switch(PREFS.endpointUrl){
      case "http://localhost" :

        url = PREFS.endpointUrl+":"+PREFS.portNumber
        httpbody =  PREFS.proompt+"\n\n"+msg.text;

        res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: httpbody
          });

         body = (await res.text()).trim();
          
         sendResponse({ ok: true, body });
      break;
      case "https://api.openai.com/v1/responses" :

        httpinput =  PREFS.proompt+"\n\n"+msg.text;

         res = await fetch(PREFS.endpointUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" , "Authorization": `Bearer ${PREFS.secretToken}`},
              body:JSON.stringify({
                  model: PREFS.modelName,
                  input: httpinput,
                  max_output_tokens: 16
                })
             });
            
             data = await res.json();


             body = data.output[0].content[0].text;
             console.log(data);
             console.log(body);


            sendResponse({ ok: true, body });
      break;
       case "https://api.anthropic.com/v1/messages" :

        httpinput =  PREFS.proompt+"\n\n"+msg.text;

         res = await fetch(PREFS.endpointUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" ,"anthropic-version": "2023-06-01", "x-api-key": `${PREFS.secretToken}`,"anthropic-dangerous-direct-browser-access": "true"},
              body:JSON.stringify({
                  model: PREFS.modelName,
                  messages: [{"role": "user", "content": httpinput}],
                  max_tokens: 1
                })
             });
            
             data = await res.json();


             body = data.content[0].text;
             console.log(data);
             console.log(body);


            sendResponse({ ok: true, body });
      break;
      case "https://generativelanguage.googleapis.com/v1beta/models" :

        httpinput =  PREFS.proompt+"\n\n"+msg.text;
        url = PREFS.endpointUrl+"/"+PREFS.modelName+":streamGenerateContent"

         res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" , "x-goog-api-key": `${PREFS.secretToken}`},
              body:JSON.stringify({
                  contents:[
                    {
                      parts:[
                      {
                        text: httpinput
                      }
                    ]
                    }
                  ]
                })
             });
            
             data = await res.json();


             body = data.candidates[0].content;
             console.log(data);
             console.log(body);


            sendResponse({ ok: true, body });
      break;

    }

   
  })().catch((e) => {
    sendResponse({ ok: false, error: String(e) });
  });

  return true; // keep sendResponse alive for async
});

