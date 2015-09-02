Ext.define('Ext.data.model.CouchDB', {
    extend: 'Ext.data.Model',
    alias: 'model.couchdb',
    save: function(options) {
        options = Ext.apply({}, options);

        var me = this,
            childRecord = false,
            phantom = me.phantom,
            dropped = me.dropped,
            action = dropped ? 'destroy' : (phantom ? 'create' : 'update'),
            scope  = options.scope || me,
            callback = options.callback,
            proxy = me.getProxy(),
            operation;

        //check to see if this is a parent association; if it isn't call the parent record save method.
        if (!Ext.Object.isEmpty(me.associations)){
            Ext.iterate(me.associations, function(k,v){
                var parent;
                if(!me.associations[k].left){
                    parent = me[me.associations[k].getterName]()
                    parent.save(options);
                    childRecord = true;
                    return false;
                }
            });
        }

        if (childRecord){
            return;
        }

        options.records = [me];
        options.internalCallback = function(operation) {
            var args = [me, operation],
                success = operation.wasSuccessful();
            if (success) {
                Ext.callback(options.success, scope, args);
            } else {
                Ext.callback(options.failure, scope, args);
            }
            args.push(success);
            Ext.callback(callback, scope, args);
        };
        delete options.callback;

        operation = proxy.createOperation(action, options);

        // Not a phantom, then we must perform this operation on the remote datasource.
        // Record will be removed from the store in the callback upon a success response
        if (dropped && phantom) {
            // If it's a phantom, then call the callback directly with a dummy successful ResultSet
            operation.setResultSet(Ext.data.reader.Reader.prototype.nullResultSet);
            me.setErased();
            operation.setSuccessful(true);
        } else {
            operation.execute();
        }
        return operation;
    }
});