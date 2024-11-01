import { ScriptLoadOptions } from './script-load-options';

const allScripts = new Map<string, ScriptInformation>();

if (typeof document !== 'undefined') {
  document.onreadystatechange = () => {
    document.querySelectorAll('script[src]').forEach((tag) => {
      const scriptTag = <HTMLScriptElement>tag;
      allScripts.set(scriptTag.src, {
        tag: scriptTag,
        fullyLoaded: true,
        initiallyLoaded: true,
        promisesToResolve: [],
      });
    });
  }
}

export function loadScript(src: string, options?: ScriptLoadOptions) {
  return new Promise<any[]>((resolve, reject) => {
    src = src.replace('"', '');
    // Only act if in the browser
    if (typeof window === 'undefined') {
      return resolve([]);
    }

    // Check if we're already handling this script url
    const existingScript = allScripts.get(src);
    if (existingScript) {
      if (existingScript.fullyLoaded) {
        // Script is already in DOM, and we already got the loaded callback
        return resolve(existingScript.receivedArgs ?? []);
      } else {
        // Script is already being loaded, but we didn't get the callback yet
        existingScript.promisesToResolve.push(resolve);
        return;
      }
    } else {
      const scriptInfo: ScriptInformation = {
        fullyLoaded: false,
        initiallyLoaded: false,
        promisesToResolve: [resolve],
      };
      allScripts.set(src, scriptInfo);

      // Create scripttag
      const scriptTag: HTMLScriptElement = document.createElement('script');
      // scriptTag.type = 'text/javascript';
      scriptTag.src = src;
      scriptInfo.tag = scriptTag;

      if (options?.async) {
        scriptTag.async = true
      }
      if (options?.defer) {
        scriptTag.defer = true;
      }

      // Setup callback
      if (options?.windowCallback) {
        (<any>window)[options.windowCallback] = (...args: any[]) => {
          scriptInfo.fullyLoaded = true;
          scriptInfo.receivedArgs = args;
          scriptInfo.promisesToResolve.forEach((p) => p(args));
        };
      } else {
        scriptTag.addEventListener('load', (...args: any[]) => {
          scriptInfo.fullyLoaded = true;
          scriptInfo.receivedArgs = args;
          scriptInfo.promisesToResolve.forEach((p) => p(args));
        });
      }

      scriptTag.addEventListener('error', () => reject(`${src} failed to load`));

      // Insert in DOM
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (!firstScriptTag) {
        document.head.appendChild(scriptTag);
      } else if (firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);
      } else {
        throw 'First script tag has no parent node';
      }
    }
  });
}

interface ScriptInformation {
  tag?: HTMLScriptElement;
  fullyLoaded: boolean;
  initiallyLoaded: boolean;
  promisesToResolve: ((value: any[] | PromiseLike<any[]>) => void)[];

  /** These are the parameters received from the windowCallback or script.onload method. */
  receivedArgs?: any[];
}
