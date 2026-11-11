<?php

namespace App\Shared\Presentation\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocaleController
{
    public function update(Request $request): RedirectResponse
    {
        $locale = $request->validate(['locale' => 'required|in:en,id'])['locale'];

        if (auth()->check()) {
            auth()->user()->update(['locale' => $locale]);
        }

        session(['locale' => $locale]);

        return back();
    }
}

