declare module "xid-js" {
    /**
     * XID generator object with next() method
     */
    interface XIDGenerator {
      /**
       * Generate a new XID
       * @returns {string} A new XID string (20 characters, base32 encoded)
       */
      next(): string;
    }
  
    const XID: XIDGenerator;
    export = XID;
  }
  