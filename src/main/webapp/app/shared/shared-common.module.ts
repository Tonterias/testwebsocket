import { NgModule } from '@angular/core';

import { TestwebsocketSharedLibsModule, JhiAlertComponent, JhiAlertErrorComponent } from './';

@NgModule({
    imports: [TestwebsocketSharedLibsModule],
    declarations: [JhiAlertComponent, JhiAlertErrorComponent],
    exports: [TestwebsocketSharedLibsModule, JhiAlertComponent, JhiAlertErrorComponent]
})
export class TestwebsocketSharedCommonModule {}
