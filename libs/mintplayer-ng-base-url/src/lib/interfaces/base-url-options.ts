export interface BaseUrlOptions {
    /** Specifies whether the scheme (http or https) should be dropped from the url. */
    dropScheme: boolean;

    /** Inserts the specified subdomain in the generated url. */
    subdomain?: string;
}