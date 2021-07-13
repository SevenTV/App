import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from 'src/app/admin/admin.guard';
import { HomeComponent } from 'src/app/home/home.component';
import { CallbackGuard } from './navigation/callback.guard';


const routes: Routes = [
	{
		path: '',
		data: {
			title: 'Home'
		},
		loadChildren: () => import('src/app/home/home.module').then(m => m.HomeModule)
	},
	{
		path: 'about',
		data: {
		  title: 'About'
		},
		loadChildren: () => import('src/app/about/about.module').then(m => m.AboutModule)
	},
	{
		path: 'emotes',
		loadChildren: () => import('src/app/emotes/emotes.module').then(m => m.EmotesModule)
	},
	{
		path: 'subscribe',
		loadChildren: () => import('src/app/store/store.module').then(m => m.StoreModule)
	},
	{ path: 'store', redirectTo: 'subscribe' },
	{ path: 'donate', redirectTo: 'subscribe' },

	{
		path: 'admin',
		// canLoad: [AdminGuard],
		loadChildren: () => import('src/app/admin/admin.module').then(m => m.AdminModule)
	},
	{
		path: 'users',
		loadChildren: () => import('src/app/user/user.module').then(m => m.UserModule)
	},
	{ path: 'user', redirectTo: 'users' },

	{
		path: 'callback',
		data: {
			layoutDisabled: true
		},
		canActivate: [CallbackGuard],
		component: HomeComponent
	},

	{ path: '**', redirectTo: '/' }
];

@NgModule({
	imports: [RouterModule.forRoot(routes, {
		initialNavigation: 'enabled'
	})],
	providers: [AdminGuard],
	exports: [RouterModule]
})
export class AppRoutingModule { }
